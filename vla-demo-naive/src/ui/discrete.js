import { createDiscreteApi, darkTheme } from 'naive-ui'

const { message, notification, dialog } = createDiscreteApi(
  ['message', 'notification', 'dialog'],
  {
    configProviderProps: {
      theme: darkTheme,
      themeOverrides: {
        common: {
          primaryColor: '#18A058',
          primaryColorHover: '#36AD6A',
          primaryColorPressed: '#0C7A43',
          primaryColorSuppl: '#63E2B7',
        },
      },
    },
  },
)

export { message, notification, dialog }
