import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Stack } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { AINotebookItemDefinition, VIEW_TYPES, CurrentView } from "./AINotebookItemModel";
import { AINotebookItemEditorNotebook } from "./AINotebookItemEditorNotebook";
import { AINotebookItemRibbon } from "./AINotebookItemRibbon";
import { NotebookCell } from "../../components/NotebookEditor";
import { AssistantPlan } from "../../clients/AzureOpenAIClient";
import "../../styles.scss";


export function AINotebookItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<AINotebookItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.NOTEBOOK);
  const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(false);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<AINotebookItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        LoadedItem = await getWorkloadItem<AINotebookItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              state: undefined,
              notebookCells: [],
              assistantPlan: undefined,
              lakehouseId: undefined,
              lakehouseName: undefined,
            }
          };
        }
        else {
          console.log('LoadedItem definition: ', LoadedItem.definition);
        }

        setItem(LoadedItem);
        setCurrentView(VIEW_TYPES.NOTEBOOK);

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

  const SaveNotebookData = useCallback(async (plan?: AssistantPlan, cells?: NotebookCell[]) => {
    if (!item) return;
    
    const newDefinition: AINotebookItemDefinition = {
      ...item.definition,
      state: VIEW_TYPES.NOTEBOOK,
      assistantPlan: plan || item.definition?.assistantPlan,
      notebookCells: cells || item.definition?.notebookCells,
    };

    const successResult = await saveItemDefinition<AINotebookItemDefinition>(
      workloadClient,
      item.id,
      newDefinition
    );

    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
    
    if (wasSaved) {
      // Update local state with saved data
      setItem(prev => prev ? {
        ...prev,
        definition: newDefinition
      } : prev);
    }
  }, [item, workloadClient, props.workloadClient, t]);

  async function SaveItem() {
    var successResult = await saveItemDefinition<AINotebookItemDefinition>(
      workloadClient,
      item.id,
      {
        ...item.definition,
        state: VIEW_TYPES.NOTEBOOK
      });
    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
  }

  const isSaveEnabled = () => {
    // In notebook view, save is always available if not just saved
    if (hasBeenSaved) {
      return false;
    }
    return true;
  };


  // Show loading state
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("AINotebookItemEditor_Loading", "Loading AI Notebook...")}
      />
    );
  }

  // Render notebook view
  return (
    <Stack className="editor" data-testid="item-editor-inner">
      <AINotebookItemRibbon
        {...props}
        isSaveButtonEnabled={isSaveEnabled()}
        currentView={currentView}
        saveItemCallback={SaveItem}
        openSettingsCallback={handleOpenSettings}
      />
      <AINotebookItemEditorNotebook
        workloadClient={workloadClient}
        item={item}
        onSave={SaveNotebookData}
      />
    </Stack>
  );
}
