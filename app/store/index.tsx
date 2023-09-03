import { configureStore } from '@reduxjs/toolkit';
import positionSlice from './slices/positionSlice';
import { aaveApi } from './services/aaveApi';
import { coingeckoApi } from './services/coingeckoApi';

export const store = configureStore({
    reducer: {
        position: positionSlice,
        [aaveApi.reducerPath]: aaveApi.reducer,
        [coingeckoApi.reducerPath]: coingeckoApi.reducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(aaveApi.middleware, coingeckoApi.middleware);
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
