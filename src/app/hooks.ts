/**
 * Sheba Sound — Typed Redux Hooks
 * --------------------------------
 * Pre-typed versions of useDispatch and useSelector so every consumer
 * automatically gets the correct RootState / AppDispatch types.
 */

import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
