import React, { createContext, useContext, useReducer, useEffect } from 'react';

import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  serverConnected,
  serverDisconnected,
  deactivateConnection,
  changeAmount,
  resetState,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';
import dappConstants from '../utils/constants';

const { CONTRACT_ID } = dappConstants;

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, createDefaultState());
  const {
    active,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    freeVariable,
  } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, data } = message;
      if (type === 'walletUpdatePurses') {
        dispatch(updatePurses(JSON.parse(data)));
      }
    }

    function walletGetPurses() {
      return doFetch({ type: 'walletGetPurses' }).then(messageHandler);
    }

    if (active) {
      activateWebSocket({
        onConnect() {
          dispatch(serverConnected());
          walletGetPurses();
        },
        onDisconnect() {
          dispatch(serverDisconnected());
          dispatch(deactivateConnection());
          dispatch(resetState());
        },
        onMessage(message) {
          messageHandler(JSON.parse(message));
        },
      });
    } else {
      deactivateWebSocket();
    }
  }, [active]);

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, data } = message;
      if (type === 'autoswapPrice') {
        dispatch(changeAmount(data, 1 - freeVariable));
      }
    }

    if (inputPurse && outputPurse && freeVariable === 0 && inputAmount > 0) {
      doFetch({
        type: 'autoswapGetPrice',
        data: {
          instanceId: CONTRACT_ID,
          extent0: inputAmount,
          issuerId0: inputPurse.issuerRegKey,
          issuerId1: outputPurse.issuerRegKey,
        },
      }).then(messageHandler);
    }

    if (inputPurse && outputPurse && freeVariable === 1 && outputAmount > 0) {
      doFetch({
        type: 'autoswapGetPrice',
        data: {
          instanceId: CONTRACT_ID,
          extent0: outputAmount,
          issuerId0: outputPurse.issuerRegKey,
          issuerId1: inputPurse.issuerRegKey,
        },
      }).then(messageHandler);
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount, freeVariable]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
/* eslint-enable complexity, react/prop-types */
