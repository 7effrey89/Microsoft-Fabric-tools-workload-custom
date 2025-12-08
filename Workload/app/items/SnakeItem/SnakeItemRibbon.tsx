import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar } from '@fluentui/react-toolbar';
import {
  ToolbarButton, Tooltip
} from '@fluentui/react-components';
import {
  Save24Regular,
  Settings24Regular,
} from "@fluentui/react-icons";
import { PageProps } from '../../App';
import { CurrentView } from "./SnakeItemModel";
import { useTranslation } from "react-i18next";
import '../../styles.scss';

/**
 * Props interface for the Snake Item Ribbon component
 */
export interface SnakeItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  currentView: CurrentView;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
}


const SnakeItemTabToolbar: React.FC<SnakeItemRibbonProps> = (props) => {
  const { t } = useTranslation();


  const handleSettingsClick = async () => {
    await props.openSettingsCallback();
  };

  async function onSaveAsClicked() {
    await props.saveItemCallback();
    return;
  }

  return (
    <Toolbar>
      {/* Save Button */}
      <Tooltip
        content={t("SnakeItemEditor_Ribbon_Save_Tooltip", "Save High Score")}
        relationship="label">
        <ToolbarButton
          disabled={!props.isSaveButtonEnabled}
          aria-label={t("ItemEditor_Ribbon_Save_Label")}
          data-testid="item-editor-save-btn"
          icon={<Save24Regular />}
          onClick={onSaveAsClicked}
        />
      </Tooltip>

      {/* Settings Button */}
      <Tooltip
        content={t("ItemEditor_Ribbon_Settings_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("ItemEditor_Ribbon_Settings_Label")}
          data-testid="item-editor-settings-btn"
          icon={<Settings24Regular />}
          onClick={handleSettingsClick} 
        />
      </Tooltip>
    </Toolbar>
  );
};

/**
 * Main Ribbon component for Snake Game
 */
export function SnakeItemRibbon(props: SnakeItemRibbonProps) {
  const { t } = useTranslation();

  return (
    <div className="ribbon">
      <TabList defaultSelectedValue="game">
        <Tab value="game" data-testid="game-tab-btn">
          {t("SnakeItemEditor_Ribbon_Game_Label", "🐍 Game")}
        </Tab>
      </TabList>

      {/* Toolbar Container */}
      <div className="toolbarContainer">
        <SnakeItemTabToolbar {...props} />
      </div>
    </div>
  );
}
