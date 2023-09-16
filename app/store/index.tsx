import { configureStore } from '@reduxjs/toolkit';
import positionSlice from './slices/positionSlice';
import { aaveApi } from './services/aaveApi';
import { coingeckoApi } from './services/coingeckoApi';
import { simulatorApi } from './services/simulatorApi';

export const store = configureStore({
    reducer: {
        position: positionSlice,
        [aaveApi.reducerPath]: aaveApi.reducer,
        [coingeckoApi.reducerPath]: coingeckoApi.reducer,
        [simulatorApi.reducerPath]: simulatorApi.reducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(aaveApi.middleware, coingeckoApi.middleware, simulatorApi.middleware);
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
