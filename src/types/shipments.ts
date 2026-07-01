/** Tipos compartidos entre web, móvil y tests (sin depender de componentes .tsx). */

export interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

export interface Consignee {
  id?: number;
  name?: string;
  accountNumber?: string | null;
  code?: string | null;
  email?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface AirShipment {
  id?: string | number;
  number?: string;
  date?: string;
  consignee?: Consignee;
  origin?: { code?: string; name?: string; [key: string]: any } | null;
  destination?: { code?: string; name?: string; [key: string]: any } | null;
  executedAt?: { code?: string; name?: string; [key: string]: any } | null;
  trackingNumber?: string;
  waybillNumber?: string;
  customerReference?: string;
  carrier?: Consignee | null;
  departure?: {
    date?: string;
    displayDate?: string;
    type?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;
  arrival?: {
    date?: string;
    displayDate?: string;
    type?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface OceanShipment {
  id?: number;
  number?: string;
  operationFlow?: string;
  shipmentType?: string;
  currentFlow?: string;
  departure?: string;
  arrival?: string;
  portOfLoading?: string;
  portOfUnloading?: string;
  placeOfDelivery?: string;
  finalDestination?: string;
  vessel?: string;
  voyage?: string;
  carrier?: string;
  bookingNumber?: string;
  waybillNumber?: string;
  containerNumber?: string;
  consignee?: string;
  consigneeId?: number;
  consigneeAddress?: string;
  shipper?: string;
  shipperAddress?: string;
  customer?: string;
  customerReference?: string;
  salesRep?: string;
  accountingStatus?: string;
  cargoDescription?: string;
  cargoStatus?: string;
  typeOfMove?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightDisplayValue?: string;
  totalCargo_VolumeDisplayValue?: string;
  totalCharge_IncomeDisplayValue?: string;
  totalCharge_ExpenseDisplayValue?: string;
  totalCharge_ProfitDisplayValue?: string;
  createdOn?: string;
  hazardous?: boolean;
  containerized?: boolean;
  quoteNumber?: string;
  customsReleased?: boolean;
  freightReleased?: boolean;
  podDelivery?: string;
  entryNumber?: string;
  itNumber?: string;
  amsNumber?: string;
  broker?: string;
  notes?: string;
  trackingNumber?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface GroundShipment {
  id?: number;
  number?: string;
  operationFlow?: string;
  shipmentType?: string;
  shipmentClass?: string;
  currentFlow?: string;
  departure?: string;
  arrival?: string;
  from?: string;
  to?: string;
  finalDestination?: string;
  carrier?: string;
  truckNumber?: string;
  trackingNumber?: string;
  proNumber?: string;
  driver?: string;
  bookingNumber?: string;
  waybillNumber?: string;
  containerNumber?: string;
  consignee?: string;
  consigneeId?: number;
  consigneeAddress?: string;
  shipper?: string;
  shipperAddress?: string;
  customer?: string;
  customerReference?: string;
  salesRep?: string;
  accountingStatus?: string;
  cargoDescription?: string;
  cargoStatus?: string;
  rateCategory?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightDisplayValue?: string;
  totalCargo_VolumeDisplayValue?: string;
  totalCharge_IncomeDisplayValue?: string;
  totalCharge_ExpenseDisplayValue?: string;
  totalCharge_ProfitDisplayValue?: string;
  createdOn?: string;
  hazardous?: boolean;
  customsReleased?: boolean;
  freightReleased?: boolean;
  paymentType?: string;
  declaredValue?: number;
  pallets?: number;
  notes?: string;
  entryNumber?: string;
  itNumber?: string;
  broker?: string;
  [key: string]: string | number | boolean | undefined;
}
