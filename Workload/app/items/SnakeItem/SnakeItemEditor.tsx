import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Stack } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveItemDefinition, callGetItem } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { SnakeItemDefinition, VIEW_TYPES, CurrentView } from "./SnakeItemModel";
import { SnakeItemRibbon } from "./SnakeItemRibbon";
import { SnakeGame } from "./SnakeGame";
import "../../styles.scss";


export function SnakeItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<SnakeItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.GAME);
  const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(false);
  const [highScore, setHighScore] = useState(0);
  const [totalEaten, setTotalEaten] = useState(0);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<SnakeItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      try {
        LoadedItem = await getWorkloadItem<SnakeItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              state: VIEW_TYPES.GAME,
              gameState: {
                highScore: 0,
                totalCompetitorsEaten: 0,
              }
            }
          };
        }

        setItem(LoadedItem);
        setHighScore(LoadedItem.definition?.gameState?.highScore || 0);
        setTotalEaten(LoadedItem.definition?.gameState?.totalCompetitorsEaten || 0);
        setCurrentView(VIEW_TYPES.GAME);

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

  const handleScoreUpdate = useCallback((score: number, newHighScore: number, competitorsEaten: number) => {
    if (newHighScore > highScore) {
      setHighScore(newHighScore);
      setHasBeenSaved(false);
    }
    setTotalEaten(prev => Math.max(prev, competitorsEaten));
  }, [highScore]);

  async function SaveItem() {
    const newDefinition: SnakeItemDefinition = {
      ...item?.definition,
      state: VIEW_TYPES.GAME,
      gameState: {
        highScore: highScore,
        totalCompetitorsEaten: totalEaten,
      }
    };

    var successResult = await saveItemDefinition<SnakeItemDefinition>(
      workloadClient,
      item.id,
      newDefinition
    );
    
    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
    
    if (wasSaved) {
      setItem(prev => prev ? { ...prev, definition: newDefinition } : prev);
    }
    
    callNotificationOpen(
      props.workloadClient,
      t("ItemEditor_Saved_Notification_Title"),
      t("SnakeItemEditor_Saved_Text", { highScore, totalEaten }),
      undefined,
      undefined
    );
  }

  const isSaveEnabled = () => {
    if (hasBeenSaved) {
      return false;
    }
    return highScore > (item?.definition?.gameState?.highScore || 0);
  };


  // Show loading state
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("SnakeItemEditor_Loading", "Loading Snake Game...")}
      />
    );
  }

  // Render game view
  return (
    <Stack className="editor" data-testid="item-editor-inner">
      <SnakeItemRibbon
        {...props}
        isSaveButtonEnabled={isSaveEnabled()}
        currentView={currentView}
        saveItemCallback={SaveItem}
        openSettingsCallback={handleOpenSettings}
      />
      <SnakeGame 
        onScoreUpdate={handleScoreUpdate}
        initialHighScore={item?.definition?.gameState?.highScore || 0}
      />
    </Stack>
  );
}
