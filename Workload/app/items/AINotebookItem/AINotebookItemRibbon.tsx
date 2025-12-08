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
import { CurrentView } from "./AINotebookItemModel";
import { useTranslation } from "react-i18next";
import '../../styles.scss';

/**
 * Props interface for the AI Notebook Ribbon component
 */
export interface AINotebookItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  currentView: CurrentView;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
}


const AINotebookItemTabToolbar: React.FC<AINotebookItemRibbonProps> = (props) => {
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
        content={t("ItemEditor_Ribbon_Save_Label")}
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
 * Main Ribbon component for AI Notebook
 */
export function AINotebookItemRibbon(props: AINotebookItemRibbonProps) {
  const { t } = useTranslation();

  return (
    <div className="ribbon">
      <TabList defaultSelectedValue="notebook">
        <Tab value="notebook" data-testid="notebook-tab-btn">
          {t("AINotebookItemEditor_Ribbon_Notebook_Label", "Notebook")}
        </Tab>
      </TabList>

      {/* Toolbar Container */}
      <div className="toolbarContainer">
        <AINotebookItemTabToolbar {...props} />
      </div>
    </div>
  );
}
