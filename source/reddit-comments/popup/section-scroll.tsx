import React, { FC } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Flex, Text, RadioGroup } from '@radix-ui/themes';
import { SettingsFormData } from './popup';

type Props = {
  form: UseFormReturn<SettingsFormData>;
};

const SectionScroll: FC<Props> = ({ form }) => {
  const { control } = form;

  return (
    <Flex direction="column" gap="4">
      <Text as="label" size="2">
        Scroll to (Ctrl+Space):
      </Text>
      <Controller
        name="scrollTo"
        control={control}
        render={({ field: { onChange, value } }) => (
          <RadioGroup.Root onValueChange={onChange} value={value} defaultValue={value}>
            <Flex gap="2">
              <Text as="label" size="2">
                <Flex gap="2">
                  <RadioGroup.Item value="both" /> Both
                </Flex>
              </Text>
              <Text as="label" size="2">
                <Flex gap="2">
                  <RadioGroup.Item value="unread" /> Unread
                </Flex>
              </Text>
              <Text as="label" size="2">
                <Flex gap="2">
                  <RadioGroup.Item value="by-date" /> By date
                </Flex>
              </Text>
            </Flex>
          </RadioGroup.Root>
        )}
      />
    </Flex>
  );
};

export default SectionScroll;
