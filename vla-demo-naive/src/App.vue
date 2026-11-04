<script setup>
import {
  darkTheme,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  zhCN,
  dateZhCN,
} from 'naive-ui'

const themeOverrides = {
  common: {
    primaryColor: '#18A058',
    primaryColorHover: '#36AD6A',
    primaryColorPressed: '#0C7A43',
    primaryColorSuppl: '#63E2B7',
    bodyColor: '#101014',
    cardColor: '#18181c',
    modalColor: '#18181c',
    popoverColor: '#18181c',
    tableColor: '#18181c',
    inputColor: '#101014',
  },
}
</script>

<template>
  <n-config-provider
    :theme="darkTheme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
