"use client";

import styles from './styles/layout.module.css';
import './styles/globals.css';
import { Provider } from 'react-redux';
import { store } from '@/app/store';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

export default function RootLayout(props: React.PropsWithChildren) {
  return (
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <html lang="en">
          <body>
            <section className={styles.container}>
              <main className={styles.main}>{props.children}</main>

              <footer className={styles.footer}>
                
              </footer>
            </section>
          </body>
        </html>
      </LocalizationProvider>
    </Provider>
  )
}
