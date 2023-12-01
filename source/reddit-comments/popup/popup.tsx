import React, { FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Theme, Container, Separator, Flex, Text } from '@radix-ui/themes';

import SectionTime from './section-time';
import SectionUnHighlight from './section-unhighlight';
import SectionDatabase from './section-database';
import SectionScroll from './section-scroll';
import SectionSort from './section-sort';
import SectionLink from './section-link';

import './popup.scss';
import { SettingsData } from '../database/schema';
import { defaultValues } from '../database/models/settings';
import useIsMounting from './useIsMounting';
import { formSubmitDebounceWait } from '../constants';
import { debounce } from '../utils';
import { messageTypes, MyMessageType, sendMessage } from '../message';

const Popup: FC = () => {
  const [reloadFormIndex, setReloadFormIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { isMounting } = useIsMounting();

  const form = useForm<SettingsData>({
    mode: 'onChange',
    defaultValues,
  });
  const { reset, getValues, watch, handleSubmit, resetField } = form;

  // console.error('getValues', getValues(), 'watch', watch());

  //! CANT USE DB, write generic function to get db data

  // pre-populate form from db
  useEffect(() => {
    const populateFormFromDb = async () => {
      try {
        const message: MyMessageType = { type: messageTypes.GET_SETTINGS_DATA_FROM_DB };
        const response: MyMessageType = await sendMessage(message);

        const settingsData: SettingsData = response.payload;
        reset({ ...settingsData, resetDb: defaultValues.resetDb });
      } catch (error) {
        console.error('Populating settings failed, error:', error);
      }
      setIsLoading(false);
    };

    populateFormFromDb();
  }, [reloadFormIndex]);

  const onSubmit = async (settingsData: SettingsData) => {
    const message: MyMessageType = {
      type: messageTypes.SUBMIT_SETTINGS_DATA,
      payload: settingsData,
    };
    await sendMessage(message);
  };

  const debouncedHandleSubmit = debounce(
    () => handleSubmit(onSubmit)(),
    formSubmitDebounceWait
  );

  const handleResetDb = async () => {
    const radioValue = getValues('resetDb');

    switch (radioValue) {
      case 'thread': {
        const message: MyMessageType = {
          type: messageTypes.RESET_THREAD_DATA,
        };
        await sendMessage(message);
        resetField('resetDb');
        break;
      }
      case 'all-threads': {
        const message: MyMessageType = {
          type: messageTypes.RESET_ALL_THREADS_DATA,
        };
        await sendMessage(message);
        resetField('resetDb'); // reset radio only
        break;
      }
      case 'user-settings': {
        const message: MyMessageType = {
          type: messageTypes.RESET_SETTINGS_DATA,
        };
        await sendMessage(message);
        setReloadFormIndex((prev) => prev + 1); // trigger useEffect
        break;
      }

      default:
        break;
    }
  };

  if (isLoading) return <Text as="div">Loading...</Text>;

  return (
    <Theme radius="medium">
      <Container id="popup" p="4">
        <form onChange={debouncedHandleSubmit}>
          <SectionTime
            form={form}
            // this causes race, fix it
            isPopupMounting={isMounting}
          />
          <Separator size="4" my="4" />
          <Flex>
            <SectionUnHighlight form={form} />
            <Separator orientation="vertical" size="3" mx="4" />
            <SectionScroll form={form} />
          </Flex>
          <Separator size="4" my="4" />
          <SectionSort form={form} />
          <Separator size="4" my="4" />
          <SectionDatabase form={form} onResetClick={handleResetDb} />
        </form>
        <Separator size="4" my="4" />
        <SectionLink />
      </Container>
    </Theme>
  );
};

export default Popup;

// time slider and scale radio
// radio unhighlight mode: scroll, url-change
// buttons clear database, clear thread, clear settings
// radio scroll to unread, scroll to by date, scroll to both
// radio sort by new
// github url
