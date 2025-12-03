import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Stack } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { HelloWorldItemDefinition, VIEW_TYPES, CurrentView } from "./HelloWorldItemModel";
import { HelloWorldItemEditorEmpty } from "./HelloWorldItemEditorEmpty";
import { HelloWorldItemEditorDefault } from "./HelloWorldItemEditorDefault";
import { HelloWorldItemEditorNotebook } from "./HelloWorldItemEditorNotebook";

import { AssistantPlan } from "../../clients/AzureOpenAIClient";
import "../../styles.scss";
import { HelloWorldItemRibbon } from "./HelloWorldItemRibbon";


export function HelloWorldItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<HelloWorldItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.EMPTY);
  const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(false);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<HelloWorldItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        LoadedItem = await getWorkloadItem<HelloWorldItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              state: undefined,
            }
          };
        }
        else {
          console.log('LoadedItem definition: ', LoadedItem.definition);
        }

        setItem(LoadedItem);
        setCurrentView(!LoadedItem?.definition?.state ? VIEW_TYPES.EMPTY : VIEW_TYPES.GETTING_STARTED);

      } catch (error) {
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    setHasBeenSaved(false);
  }, [currentView, item?.id]);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);


  const navigateToGettingStarted = () => {
    setCurrentView(VIEW_TYPES.GETTING_STARTED);
  };

  const navigateToNotebook = () => {
    setCurrentView(VIEW_TYPES.NOTEBOOK);
  };

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  async function SaveItem() {
    var successResult = await saveItemDefinition<HelloWorldItemDefinition>(
      workloadClient,
      item.id,
      {
        state: currentView,
        notebookCells: item.definition?.notebookCells,
        assistantPlan: item.definition?.assistantPlan,
        lakehouseId: item.definition?.lakehouseId,
        lakehouseName: item.definition?.lakehouseName
      });
    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
    callNotificationOpen(
      props.workloadClient,
      t("ItemEditor_Saved_Notification_Title"),
      t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
      undefined,
      undefined
    );
  }

  async function SaveNotebookData(
    plan?: AssistantPlan,
    lakehouseId?: string,
    notebookId?: string
  ) {
    const updatedDefinition: HelloWorldItemDefinition = {
      ...item.definition,
      state: VIEW_TYPES.NOTEBOOK,
      assistantPlan: plan,
      lakehouseId: lakehouseId,
      notebookId: notebookId
    };

    await saveItemDefinition<HelloWorldItemDefinition>(
      workloadClient,
      item.id,
      updatedDefinition
    );

    // Update local item state
    setItem({
      ...item,
      definition: updatedDefinition
    });
  }

  const isSaveEnabled = () => {
    if (currentView === VIEW_TYPES.EMPTY) {
      return false;
    }

    if (currentView === VIEW_TYPES.GETTING_STARTED) {
      if (hasBeenSaved) {
        return false;
      }

      if (!item?.definition?.state) {
        return true;
      }

      return false;
    }

    return false;
  };


  // Show loading state
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("HelloWorldItemEditor_Loading", "Loading item...")}
      />
    );
  }

  // Render appropriate view based on state
  return (
    <Stack className="editor" data-testid="item-editor-inner">
      {currentView !== VIEW_TYPES.NOTEBOOK && (
        <HelloWorldItemRibbon
          {...props}
          isSaveButtonEnabled={isSaveEnabled()}
          currentView={currentView}
          saveItemCallback={SaveItem}
          openSettingsCallback={handleOpenSettings}
          navigateToGettingStartedCallback={navigateToGettingStarted}
          navigateToNotebookCallback={navigateToNotebook}
        />
      )}
      {currentView === VIEW_TYPES.EMPTY ? (
        <HelloWorldItemEditorEmpty
          workloadClient={workloadClient}
          item={item}
          onNavigateToGettingStarted={navigateToGettingStarted}
        />
      ) : currentView === VIEW_TYPES.NOTEBOOK ? (
        <HelloWorldItemEditorNotebook
          workloadClient={workloadClient}
          item={item}
          onSave={SaveNotebookData}
        />
      ) : (
        <HelloWorldItemEditorDefault
          workloadClient={workloadClient}
          item={item}
        />
      )}
    </Stack>
  );
}