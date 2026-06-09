import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SelectOption } from "../Selectroute";

import type { RutaAerea } from "../Handlers/Air/HandlerQuoteAir";

import {

  buildAirConnectExwCalculateInput,

  buildAirConnectFcaCalculateInput,

  buildAirConnectParcels,

  buildAirConnectPricedOffers,

  createAirConnectMockRuta,

  createAirConnectMockRutaFromPostal,

  fetchAirConnectQuotation,

  formatAirConnectFetchError,

  mapAirConnectQuoteToRuta,

  type AirConnectPricedOffer,

  type AirConnectQuotationResponse,

  type AirConnectCargoInput,

} from "../../../services/airConnectSpainQuote";

import {

  getAirConnectProfitMarkupPct,

  type IAirConnectSpainConfig,

} from "../../../types/airConnectSpainConfig";

import {

  AIR_CONNECT_EXW_POSTAL_ERROR,

  isAirConnectSpainExwFlow,

  isAirConnectSpainFcaFlow,

  isAirConnectSpainFlow,

  isValidSpainPostalCode,

} from "./flow";

import { calculateAirConnectStep3Extras } from "./step3Extras";

import type { IAgenciaAduanaConfig } from "../../../types/agenciaAduana";



export interface UseAirConnectSpainParams {

  routeMode: "recurrente" | "noRecurrente" | null;

  paisValue?: string;

  destValue?: string;

  incoterm: "EXW" | "FCA" | "";

  isSimulationMode: boolean;

  originSeleccionado: SelectOption | null;

  rutaSeleccionada: RutaAerea | null;

  setRutaSeleccionada: (ruta: RutaAerea | null) => void;

  currentStep: number;

  canProceedToStep3: boolean;

  cargo: AirConnectCargoInput;

  contactCompanyName: string;

  authToken?: string | null;

  config: IAirConnectSpainConfig;

  pesoChargeable: number;

  step3: {

    ultimaMillaActivo: boolean;

    calculateUltimaMilla: () => number;

    seguroActivo: boolean;

    valorMercaderia: string;

    aduanaActivo: boolean;

    valorProductoAduana: string;

    aduanaConfig: IAgenciaAduanaConfig | null;

    gastolocal: boolean;

  };

  onAdvanceToStep2: () => void;

  onCargoInputsChanged: () => void;

}



export function useAirConnectSpain(params: UseAirConnectSpainParams) {

  const flowParams = {

    routeMode: params.routeMode,

    paisValue: params.paisValue,

    destValue: params.destValue,

    incoterm: params.incoterm,

    isSimulationMode: params.isSimulationMode,

  };



  const isActive = isAirConnectSpainFlow(flowParams);

  const isFca = isAirConnectSpainFcaFlow(flowParams);

  const isExw = isAirConnectSpainExwFlow(flowParams);



  const [postalCode, setPostalCode] = useState("");

  const [quote, setQuote] = useState<AirConnectQuotationResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [exwPostalRetryActive, setExwPostalRetryActive] = useState(false);



  const prevFcaOriginRef = useRef<string | null>(null);

  const prevExwPostalRef = useRef<string | null>(null);

  const quoteFetchGenerationRef = useRef(0);

  const prevInputsSnapshotRef = useRef("");



  const profitMarkupPct = getAirConnectProfitMarkupPct(

    params.config,

    params.incoterm,

  );



  const clearQuoteSelection = useCallback(() => {

    setQuote(null);

    setError(null);

    setSelectedKey(null);

    setLoading(false);

  }, []);



  const {

    setRutaSeleccionada,

    onAdvanceToStep2,

    onCargoInputsChanged,

    originSeleccionado,

    rutaSeleccionada,

    currentStep,

    canProceedToStep3,

    cargo,

    contactCompanyName,

    authToken,

    pesoChargeable,

    step3,

  } = params;



  const cargoSnapshotKey = useMemo(

    () =>

      JSON.stringify({

        overallDimsAndWeight: cargo.overallDimsAndWeight,

        manualWeight: cargo.manualWeight,

        manualVolume: cargo.manualVolume,

        pieces: cargo.pieces,

      }),

    [

      cargo.overallDimsAndWeight,

      cargo.manualWeight,

      cargo.manualVolume,

      cargo.pieces,

    ],

  );



  const inputsSnapshotKey = useMemo(() => {
    const snapshot: Record<string, unknown> = {
      cargo: cargoSnapshotKey,
      origin: originSeleccionado?.value ?? null,
      seguroActivo: step3.seguroActivo,
      aduanaActivo: step3.aduanaActivo,
      ultimaMillaActivo: step3.ultimaMillaActivo,
      valorMercaderia: step3.valorMercaderia,
      valorProductoAduana: step3.valorProductoAduana,
    };
    // En paso 4 EXW el CP se corrige manualmente con "Cotizar"
    if (!(currentStep === 4 && isExw)) {
      snapshot.postalCode = postalCode;
    }
    return JSON.stringify(snapshot);
  }, [
    cargoSnapshotKey,
    originSeleccionado?.value,
    postalCode,
    currentStep,
    isExw,
    step3.seguroActivo,
    step3.aduanaActivo,
    step3.ultimaMillaActivo,
    step3.valorMercaderia,
    step3.valorProductoAduana,
  ]);



  const handlePostalCodeChange = useCallback(
    (value: string) => {
      setPostalCode(value);

      if (isExw && currentStep === 4) {
        return;
      }

      clearQuoteSelection();
      if (!isExw) return;
      setRutaSeleccionada(
        isValidSpainPostalCode(value)
          ? createAirConnectMockRutaFromPostal(value)
          : null,
      );
    },
    [clearQuoteSelection, currentStep, isExw, setRutaSeleccionada],
  );



  const handleOriginChange = useCallback(

    (option: SelectOption | null) => {

      clearQuoteSelection();

      if (isFca && option) {

        setRutaSeleccionada(createAirConnectMockRuta(option));

      } else if (isFca) {

        setRutaSeleccionada(null);

      }

    },

    [clearQuoteSelection, isFca, setRutaSeleccionada],

  );



  const isRouteStepReady = isFca

    ? !!originSeleccionado

    : isExw

      ? isValidSpainPostalCode(postalCode)

      : false;



  useEffect(() => {

    if (!isActive) {

      prevFcaOriginRef.current = null;

      prevExwPostalRef.current = null;

      return;

    }



    if (currentStep !== 1) return;



    if (isFca && originSeleccionado) {

      const originValue = originSeleccionado.value;

      if (originValue === prevFcaOriginRef.current) return;

      prevFcaOriginRef.current = originValue;

      if (!rutaSeleccionada) {

        setRutaSeleccionada(createAirConnectMockRuta(originSeleccionado));

      }

      onAdvanceToStep2();

      return;

    }



    if (isExw && isValidSpainPostalCode(postalCode)) {

      if (postalCode === prevExwPostalRef.current) return;

      prevExwPostalRef.current = postalCode;

      if (!rutaSeleccionada) {

        setRutaSeleccionada(createAirConnectMockRutaFromPostal(postalCode));

      }

      onAdvanceToStep2();

      return;

    }



    if (!isFca || !originSeleccionado) {

      prevFcaOriginRef.current = null;

    }

    if (!isExw || !isValidSpainPostalCode(postalCode)) {

      prevExwPostalRef.current = null;

    }

  }, [

    isActive,

    isFca,

    isExw,

    originSeleccionado,

    rutaSeleccionada,

    currentStep,

    postalCode,

    setRutaSeleccionada,

    onAdvanceToStep2,

  ]);



  useEffect(() => {

    if (!isActive) return;

    if (prevInputsSnapshotRef.current === inputsSnapshotKey) return;

    prevInputsSnapshotRef.current = inputsSnapshotKey;

    clearQuoteSelection();

    onCargoInputsChanged();

  }, [

    isActive,

    inputsSnapshotKey,

    clearQuoteSelection,

    onCargoInputsChanged,

  ]);



  const runQuoteFetch = useCallback(async () => {

    if (!isActive || !canProceedToStep3) return;



    const parcelProbe = buildAirConnectParcels(cargo)[0];

    if (!parcelProbe.weight) {

      setError(

        "Indica el peso del cargamento en el Paso 2 antes de consultar tarifas.",

      );

      return;

    }



    if (isFca && !originSeleccionado?.value) {

      setError("Selecciona un aeropuerto de origen en el Paso 1.");

      return;

    }

    if (isExw && !isValidSpainPostalCode(postalCode)) {
      setExwPostalRetryActive(true);
      setError(AIR_CONNECT_EXW_POSTAL_ERROR);
      return;
    }

    if (!authToken) {

      setError(

        "Sesión no válida. Cierra sesión, vuelve a entrar e inténtalo de nuevo.",

      );

      return;

    }



    const generation = ++quoteFetchGenerationRef.current;

    setLoading(true);

    setError(null);



    try {

      const cargoPayload = {

        ...cargo,

        contactCompanyName,

      };

      const input = isExw

        ? buildAirConnectExwCalculateInput({

            postalCode,

            ...cargoPayload,

          })

        : buildAirConnectFcaCalculateInput({

            airportOrigin: originSeleccionado!.value,

            ...cargoPayload,

          });



      const data = await fetchAirConnectQuotation(input, authToken);

      if (generation !== quoteFetchGenerationRef.current) return;

      setQuote(data);
      setExwPostalRetryActive(false);
      setRutaSeleccionada(mapAirConnectQuoteToRuta(data));

    } catch (err) {

      if (generation !== quoteFetchGenerationRef.current) return;

      if (isExw) {
        setExwPostalRetryActive(true);
      }
      setError(formatAirConnectFetchError(err, isExw ? "EXW" : "FCA"));

      setQuote(null);

    } finally {

      if (generation === quoteFetchGenerationRef.current) {

        setLoading(false);

      }

    }

  }, [

    isActive,

    isFca,

    isExw,

    canProceedToStep3,

    cargoSnapshotKey,

    contactCompanyName,

    authToken,

    originSeleccionado?.value,

    postalCode,

    setRutaSeleccionada,

  ]);



  const retryQuote = useCallback(() => {
    if (isExw && !isValidSpainPostalCode(postalCode)) {
      setExwPostalRetryActive(true);
      setError(AIR_CONNECT_EXW_POSTAL_ERROR);
      return;
    }
    void runQuoteFetch();
  }, [isExw, postalCode, runQuoteFetch]);

  const step4AutoFetchKey = useMemo(
    () =>
      JSON.stringify({
        step: currentStep,
        active: isActive,
        canProceed: canProceedToStep3,
        cargo: cargoSnapshotKey,
        origin: originSeleccionado?.value ?? null,
        incoterm: isFca ? "FCA" : isExw ? "EXW" : "",
        auth: authToken ?? null,
      }),
    [
      currentStep,
      isActive,
      canProceedToStep3,
      cargoSnapshotKey,
      originSeleccionado?.value,
      isFca,
      isExw,
      authToken,
    ],
  );

  useEffect(() => {

    if (currentStep !== 4 || !isActive) return;

    void runQuoteFetch();

    return () => {

      quoteFetchGenerationRef.current += 1;

    };

  }, [step4AutoFetchKey, runQuoteFetch]);



  const pricedOffers = useMemo((): AirConnectPricedOffer[] => {

    if (!quote) return [];

    return buildAirConnectPricedOffers(quote, pesoChargeable, profitMarkupPct);

  }, [quote, pesoChargeable, profitMarkupPct]);



  const step3Baseline = useMemo(() => {

    if (pricedOffers.length === 0) return 0;

    return Math.min(...pricedOffers.map((o) => o.apiWithLand));

  }, [pricedOffers]);



  const step3Extra = useMemo(

    () =>

      calculateAirConnectStep3Extras({

        transportBaseline: step3Baseline,

        ultimaMillaActivo: step3.ultimaMillaActivo,

        calculateUltimaMilla: step3.calculateUltimaMilla,

        seguroActivo: step3.seguroActivo,

        valorMercaderia: step3.valorMercaderia,

        aduanaActivo: step3.aduanaActivo,

        valorProductoAduana: step3.valorProductoAduana,

        aduanaConfig: step3.aduanaConfig,

        gastolocal: step3.gastolocal,

      }),

    [

      step3Baseline,

      step3.ultimaMillaActivo,

      step3.seguroActivo,

      step3.valorMercaderia,

      step3.aduanaActivo,

      step3.valorProductoAduana,

      step3.aduanaConfig,

      step3.gastolocal,

      step3.calculateUltimaMilla,

    ],

  );



  const selectedOffer = useMemo(

    () => pricedOffers.find((o) => o.key === selectedKey) ?? null,

    [pricedOffers, selectedKey],

  );



  const resetAirConnectState = useCallback(() => {

    prevFcaOriginRef.current = null;

    prevExwPostalRef.current = null;

    prevInputsSnapshotRef.current = "";

    setPostalCode("");

    setExwPostalRetryActive(false);

    clearQuoteSelection();

  }, [clearQuoteSelection]);



  return {

    isActive,

    isFca,

    isExw,

    postalCode,

    setPostalCode: handlePostalCodeChange,

    quote,

    loading,

    error,

    exwPostalRetryActive,

    selectedKey,

    setSelectedKey,

    pricedOffers,

    step3Extra,

    selectedOffer,

    profitMarkupPct,

    isRouteStepReady,

    handleOriginChange,

    fetchQuote: runQuoteFetch,

    retryQuote,

    resetAirConnectState,

    clearQuoteSelection,

  };

}


