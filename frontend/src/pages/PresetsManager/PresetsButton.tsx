// TODO refactor

import React, { FC, PropsWithChildren, ReactElement, useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTrigger,
  Input,
  Switch,
  Tab,
  TabList,
  Text
} from '@fluentui/react-components';
import {
  Accessibility28Regular,
  Chat20Regular,
  ClipboardEdit20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Edit20Regular,
  Globe20Regular
} from '@fluentui/react-icons';
import { ToolTipButton } from '../../components/ToolTipButton';
import { useTranslation } from 'react-i18next';
import { botName, Conversation, ConversationMessage, MessageType, userName } from '../Chat';
import { SelectTabEventHandler } from '@fluentui/react-tabs';
import { Labeled } from '../../components/Labeled';
import commonStore from '../../stores/commonStore';
import logo from '../../assets/images/logo.png';
import { observer } from 'mobx-react-lite';
import { MessagesEditor } from './MessagesEditor';
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime';
import { toast } from 'react-toastify';
import { CustomToastContainer } from '../../components/CustomToastContainer';
import { v4 as uuid } from 'uuid';

export type PresetType = 'chat' | 'completion' | 'chatInCompletion'

export type Preset = {
  name: string,
  tag: string,
  // if name and sourceUrl are same, it will be overridden when importing
  sourceUrl: string,
  desc: string,
  avatarImg: string,
  type: PresetType,
  // chat
  welcomeMessage: string,
  messages: ConversationMessage[],
  displayPresetMessages: boolean,
  // completion
  prompt: string,
  stop: string,
  injectStart: string,
  injectEnd: string,
  presystem?: boolean,
  userName?: string,
  assistantName?: string
}

export const defaultPreset: Preset = {
  name: 'RWKV',
  tag: 'default',
  sourceUrl: '',
  desc: '',
  avatarImg: logo,
  type: 'chat',
  welcomeMessage: '',
  displayPresetMessages: true,
  messages: [],
  prompt: '',
  stop: '',
  injectStart: '',
  injectEnd: ''
};

const setActivePreset = (preset: Preset) => {
  commonStore.setActivePreset(preset);
  //TODO if (preset.displayPresetMessages) {
  const conversation: Conversation = {};
  const conversationOrder: string[] = [];
  for (const message of preset.messages) {
    const newUuid = uuid();
    conversationOrder.push(newUuid);
    conversation[newUuid] = {
      sender: message.role === 'user' ? userName : botName,
      type: MessageType.Normal,
      color: message.role === 'user' ? 'brand' : 'colorful',
      time: new Date().toISOString(),
      content: message.content,
      side: message.role === 'user' ? 'right' : 'left',
      done: true
    };
  }
  commonStore.setConversation(conversation);
  commonStore.setConversationOrder(conversationOrder);
  //}
};

export const PresetCardFrame: FC<PropsWithChildren & { onClick?: () => void }> = (props) => {
  return <Button
    className="flex flex-col gap-1 w-32 h-56 break-all"
    style={{ minWidth: 0, borderRadius: '0.75rem', justifyContent: 'unset' }}
    onClick={props.onClick}
  >
    {props.children}
  </Button>;
};

export const PresetCard: FC<{
  avatarImg: string,
  name: string,
  desc: string,
  tag: string,
  editable: boolean,
  presetIndex: number,
  onClick?: () => void
}> = observer(({
  avatarImg, name, desc, tag, editable, presetIndex, onClick
}) => {
  const { t } = useTranslation();

  return <PresetCardFrame onClick={onClick}>
    <img src={avatarImg} className="rounded-xl select-none ml-auto mr-auto h-28" />
    <Text size={400}>{name}</Text>
    <Text size={200} style={{
      overflow: 'hidden', textOverflow: 'ellipsis',
      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'
    }}>{desc}</Text>
    <div className="grow" />
    <div className="flex justify-between w-full items-end">
      <div className="text-xs font-thin text-gray-500">{t(tag)}</div>
      {editable ?
        <ChatPresetEditor presetIndex={presetIndex} triggerButton={
          <ToolTipButton size="small" appearance="transparent" desc={t('Edit')} icon={<Edit20Regular />}
            onClick={() => {
              commonStore.setEditingPreset({ ...commonStore.presets[presetIndex] });
            }} />
        } />
        : <div />
      }
    </div>
  </PresetCardFrame>;
});

export const ChatPresetEditor: FC<{
  triggerButton: ReactElement,
  presetIndex: number
}> = observer(({ triggerButton, presetIndex }) => {
  const { t } = useTranslation();
  const [editingMessages, setEditingMessages] = useState(false);

  if (!commonStore.editingPreset)
    commonStore.setEditingPreset({ ...defaultPreset });
  const editingPreset = commonStore.editingPreset!;

  const setEditingPreset = (newParams: Partial<Preset>) => {
    commonStore.setEditingPreset({
      ...editingPreset,
      ...newParams
    });
  };

  const importPreset = () => {
    ClipboardGetText().then((text) => {
      try {
        const preset = JSON.parse(text);
        setEditingPreset(preset);
        toast(t('Imported successfully'), {
          type: 'success',
          autoClose: 1000
        });
      } catch (e) {
        toast(t('Failed to import. Please copy a preset to the clipboard.'), {
          type: 'error',
          autoClose: 2500
        });
      }
    }).catch(() => {
      toast(t('Clipboard is empty.'), {
        type: 'info',
        autoClose: 1000
      });
    });
  };

  const copyPreset = () => {
    ClipboardSetText(JSON.stringify(editingPreset)).then((success) => {
      if (success)
        toast(t('Successfully copied to clipboard.'), {
          type: 'success',
          autoClose: 1000
        });
    });
  };

  const savePreset = () => {
    if (presetIndex === -1) {
      commonStore.setPresets([...commonStore.presets, { ...editingPreset }]);
      setEditingPreset(defaultPreset);
    } else {
      commonStore.presets[presetIndex] = editingPreset;
      commonStore.setPresets(commonStore.presets);
    }
  };

  const activatePreset = () => {
    savePreset();
    setActivePreset(editingPreset);
  };

  const deletePreset = () => {
    commonStore.presets.splice(presetIndex, 1);
    commonStore.setPresets(commonStore.presets);
  };

  return <Dialog>
    <DialogTrigger disableButtonEnhancement>
      {triggerButton}
    </DialogTrigger>
    <DialogSurface style={{
      paddingTop: 0,
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '500px',
      height: '100%'
    }}>
      <DialogBody style={{ height: '100%', overflow: 'hidden' }}>
        <DialogContent className="flex flex-col gap-1 overflow-hidden">
          <CustomToastContainer />
          <div className="flex justify-between">{
            presetIndex === -1
              ? <div />
              : <DialogTrigger disableButtonEnhancement>
                <Button appearance="subtle" icon={<Delete20Regular />} onClick={deletePreset} />
              </DialogTrigger>
          }
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="subtle" icon={<Dismiss20Regular />} />
            </DialogTrigger>
          </div>
          <img src={editingPreset.avatarImg} className="rounded-xl select-none ml-auto mr-auto h-28" />
          <Labeled flex breakline label={t('Name')}
            content={
              <div className="flex gap-2">
                <Input className="grow" value={editingPreset.name} onChange={(e, data) => {
                  setEditingPreset({
                    name: data.value
                  });
                }} />
                <Button onClick={() => {
                  setEditingMessages(!editingMessages);
                }}>{!editingMessages ? t('Edit Character Settings') : t('Go Back')}</Button>
              </div>
            } />
          {
            editingMessages ?
              <div className="flex flex-col gap-1">
                <Labeled flex spaceBetween label={t('Insert default system prompt at the beginning')}
                  content={
                    <Switch checked={editingPreset.presystem === undefined ? true : editingPreset.presystem}
                      onChange={(e, data) => {
                        setEditingPreset({
                          presystem: data.checked
                        });
                      }} />
                  } />
                <Labeled flex breakline label={t('User Name')}
                  content={
                    <Input placeholder="User" value={editingPreset.userName} onChange={(e, data) => {
                      setEditingPreset({
                        userName: data.value
                      });
                    }} />
                  } />
                <Labeled flex breakline label={t('Assistant Name')}
                  content={
                    <Input placeholder="Assistant" value={editingPreset.assistantName} onChange={(e, data) => {
                      setEditingPreset({
                        assistantName: data.value
                      });
                    }} />
                  } />
                <MessagesEditor />
              </div> :
              <div className="flex flex-col gap-1 p-2 overflow-x-hidden overflow-y-auto">
                <Labeled flex breakline label={`${t('Description')} (${t('Preview Only')})`}
                  content={
                    <Input value={editingPreset.desc} onChange={(e, data) => {
                      setEditingPreset({
                        desc: data.value
                      });
                    }} />
                  } />
                <Labeled flex breakline label={t('Avatar Url')}
                  content={
                    <Input value={editingPreset.avatarImg} onChange={(e, data) => {
                      setEditingPreset({
                        avatarImg: data.value
                      });
                    }} />
                  } />
                <Labeled flex breakline label={t('Welcome Message')}
                  content={
                    <Input disabled value={editingPreset.welcomeMessage} onChange={(e, data) => {
                      setEditingPreset({
                        welcomeMessage: data.value
                      });
                    }} />
                  } />
                <Labeled flex spaceBetween label={t('Display Preset Messages')}
                  content={
                    <Switch disabled checked={editingPreset.displayPresetMessages}
                      onChange={(e, data) => {
                        setEditingPreset({
                          displayPresetMessages: data.checked
                        });
                      }} />
                  } />
                <Labeled flex breakline label={t('Tag')}
                  content={
                    <Input value={editingPreset.tag} onChange={(e, data) => {
                      setEditingPreset({
                        tag: data.value
                      });
                    }} />
                  } />
              </div>
          }
          <div className="grow" />
          <div className="flex justify-between">
            <Button onClick={importPreset}>{t('Import')}</Button>
            <Button onClick={copyPreset}>{t('Copy')}</Button>
          </div>
          <div className="flex justify-between">
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" onClick={savePreset}>{t('Save')}</Button>
            </DialogTrigger>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" onClick={activatePreset}>{t('Activate')}</Button>
            </DialogTrigger>
          </div>
        </DialogContent>
      </DialogBody>
    </DialogSurface>
  </Dialog>;
});

export const ChatPresets: FC = observer(() => {
  const { t } = useTranslation();

  return <div className="flex flex-wrap gap-2">
    <ChatPresetEditor presetIndex={-1} triggerButton={
      <PresetCardFrame>
        <div className="h-full flex items-center">
          {t('New Preset')}
        </div>
      </PresetCardFrame>}
    />
    {/*TODO <PresetCardFrame>*/}
    {/*  <div className="h-full flex items-center">*/}
    {/*    {t('Import')}*/}
    {/*  </div>*/}
    {/*</PresetCardFrame>*/}
    <PresetCard
      presetIndex={-1}
      editable={false}
      onClick={() => {
        setActivePreset(defaultPreset);
      }} avatarImg={defaultPreset.avatarImg} name={defaultPreset.name} desc={defaultPreset.desc} tag={defaultPreset.tag}
    />
    {commonStore.presets.map((preset, index) => {
      return <PresetCard
        presetIndex={index}
        editable={true}
        onClick={() => {
          setActivePreset(preset);
        }}
        key={index} avatarImg={preset.avatarImg} name={preset.name} desc={preset.desc} tag={preset.tag}
      />;
    })}
  </div>;
});

type PresetsNavigationItem = {
  icon: ReactElement;
  element: ReactElement;
};

const pages: { [label: string]: PresetsNavigationItem } = {
  Chat: {
    icon: <Chat20Regular />,
    element: <ChatPresets />
  },
  Completion: {
    icon: <ClipboardEdit20Regular />,
    element: <div>In Development</div>
  },
  Online: {
    icon: <Globe20Regular />,
    element: <div>In Development</div>
  }
};

export const PresetsManager: FC<{ initTab: string }> = ({ initTab }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(initTab);

  const selectTab: SelectTabEventHandler = (e, data) =>
    typeof data.value === 'string' ? setTab(data.value) : null;

  return <div className="flex flex-col gap-2 w-full h-full">
    <div className="flex justify-between">
      <TabList
        size="small"
        appearance="subtle"
        selectedValue={tab}
        onTabSelect={selectTab}
      >
        {Object.entries(pages).map(([label, { icon }]) => (
          <Tab icon={icon} key={label} value={label}>
            {t(label)}
          </Tab>
        ))}
      </TabList>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="subtle" icon={<Dismiss20Regular />} />
      </DialogTrigger>
    </div>
    <div className="grow overflow-x-hidden overflow-y-auto">
      {pages[tab].element}
    </div>
  </div>;
};

export const PresetsButton: FC<{
  tab: string,
  size?: 'small' | 'medium' | 'large',
  shape?: 'rounded' | 'circular' | 'square';
  appearance?: 'secondary' | 'primary' | 'outline' | 'subtle' | 'transparent';
}> = ({ tab, size, shape, appearance }) => {
  const { t } = useTranslation();

  return <Dialog>
    <DialogTrigger disableButtonEnhancement>
      <ToolTipButton desc={t('Presets')} size={size} shape={shape} appearance={appearance}
        icon={<Accessibility28Regular />} />
    </DialogTrigger>
    <DialogSurface style={{ paddingTop: 0, maxWidth: '90vw', width: 'fit-content' }}>
      <DialogBody>
        <DialogContent>
          <CustomToastContainer />
          <PresetsManager initTab={tab} />
        </DialogContent>
      </DialogBody>
    </DialogSurface>
  </Dialog>;
};