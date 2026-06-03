import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

export type QuotationStatus =
  | "WAITING_TO_BE_ACCEPTED"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "PROCESSED";

export type QuotationDecisionStatus = "ACCEPTED" | "REJECTED";
export type Incoterm = "EXW" | "FCA" | "CPT" | "CIP";
export type AwbType = "DIRECT" | "CONSOLIDATED";
export type ParcelsOrigin = "CUSTOMER_WAREHOUSE" | "AIRPORT";

export interface IncotermCalculationRequirement {
  incoterm: Incoterm;
  parcelsOrigin?: ParcelsOrigin;
  requiredFields: string[];
  optionalFields: string[];
  notes: string[];
}

export const INCOTERM_CALCULATION_REQUIREMENTS: IncotermCalculationRequirement[] =
  [
    {
      incoterm: "EXW",
      requiredFields: [
        "airportDest",
        "postalCode",
        "parcelsInput.incoterm",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Do not send parcelsInput.parcelsOrigin for EXW."],
    },
    {
      incoterm: "FCA",
      parcelsOrigin: "CUSTOMER_WAREHOUSE",
      requiredFields: [
        "airportDest",
        "postalCode",
        "parcelsInput.incoterm",
        "parcelsInput.parcelsOrigin",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Use parcelsInput.parcelsOrigin = CUSTOMER_WAREHOUSE."],
    },
    {
      incoterm: "FCA",
      parcelsOrigin: "AIRPORT",
      requiredFields: [
        "airportDest",
        "airportOrigin",
        "parcelsInput.incoterm",
        "parcelsInput.parcelsOrigin",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Use parcelsInput.parcelsOrigin = AIRPORT."],
    },
    {
      incoterm: "CPT",
      parcelsOrigin: "CUSTOMER_WAREHOUSE",
      requiredFields: [
        "airportDest",
        "postalCode",
        "parcelsInput.incoterm",
        "parcelsInput.awbType",
        "parcelsInput.parcelsOrigin",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Use parcelsInput.parcelsOrigin = CUSTOMER_WAREHOUSE."],
    },
    {
      incoterm: "CPT",
      parcelsOrigin: "AIRPORT",
      requiredFields: [
        "airportDest",
        "airportOrigin",
        "parcelsInput.incoterm",
        "parcelsInput.awbType",
        "parcelsInput.parcelsOrigin",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Use parcelsInput.parcelsOrigin = AIRPORT."],
    },
    {
      incoterm: "CIP",
      parcelsOrigin: "CUSTOMER_WAREHOUSE",
      requiredFields: [
        "airportDest",
        "postalCode",
        "parcelsInput.incoterm",
        "parcelsInput.awbType",
        "parcelsInput.parcelsOrigin",
        "parcelsInput.declaredValue",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Use parcelsInput.parcelsOrigin = CUSTOMER_WAREHOUSE."],
    },
    {
      incoterm: "CIP",
      parcelsOrigin: "AIRPORT",
      requiredFields: [
        "airportDest",
        "airportOrigin",
        "parcelsInput.incoterm",
        "parcelsInput.awbType",
        "parcelsInput.parcelsOrigin",
        "parcelsInput.declaredValue",
        "parcelsInput.parcels",
      ],
      optionalFields: ["contactCompanyName", "concepts"],
      notes: ["Use parcelsInput.parcelsOrigin = AIRPORT."],
    },
  ];

export interface AirConnectQuotationRestClientOptions {
  baseUrl: string;
  apiKey: string;
  apiPrefix?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface CalculateParcel {
  qty: number;
  width: number;
  height: number;
  length: number;
  weight?: number;
  nonStackable: boolean;
}

export interface CalculateParcelsInput {
  incoterm: Incoterm;
  awbType?: AwbType;
  parcelsOrigin?: ParcelsOrigin;
  declaredValue?: number;
  parcels: CalculateParcel[];
  weight?: number;
}

export interface QuotationConceptInput {
  category: string;
  text: string;
  cost: number;
  price: number;
}

export interface CalculateQuotationInput {
  postalCode?: string;
  airportOrigin?: string;
  airportDest: string;
  parcelsInput: CalculateParcelsInput;
  adjustQuotation?: boolean;
  contactCompanyName?: string;
  concepts?: QuotationConceptInput[];
  author?: string;
}

export interface QuotationConfirmationInput {
  eur1: boolean;
  totalAmountOrder: number;
  contactCompanyName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  consigneeName?: string;
  referenceDocumentId: string;
  cargoOrderDetails?: string;
  pickupDate?: string;
  pickupAddress?: string;
  pickupTime?: string;
  remarks?: string;
}

export interface ConfirmQuotationInput {
  version: number;
  confirmation: QuotationConfirmationInput;
}

export interface UpdateQuotationStatusByIdInput {
  version: number;
  newStatus: QuotationDecisionStatus;
}

export interface DeleteQuotationInput {
  version: number;
}

export interface GetQuotationsInput {
  status?: QuotationStatus;
  cursor?: string;
}

export interface GetQuotationsResponse<TQuotationShort = QuotationShort> {
  quotations: TQuotationShort[];
  cursor?: string;
}

export interface TotalAmount {
  airline: string;
  total: number;
}

export interface QuotationShort {
  customerId: string;
  quotationId: string;
  date: string;
  validUntil: string;
  postalCode?: string;
  cityName?: string;
  origin: string;
  destination: string;
  status: QuotationStatus;
  totalAmount: TotalAmount[];
  version: number;
  author?: string;
  incoterm: string;
  parcelsOrigin?: ParcelsOrigin;
  weight: number;
  weightType: string;
  numParcels: number;
  readByAdmin?: boolean;
  readByUser?: boolean;
  confirmation?: unknown;
}

export interface Quotation extends Record<string, unknown> {
  customerId: string;
  quotationId: string;
  status: QuotationStatus;
  version: number;
  date: string;
  validUntil: string;
  origin: string;
  destination: string;
  totalAmount: TotalAmount[];
}

interface RestErrorBody {
  error?: string;
  [key: string]: unknown;
}

export class AirConnectRestError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly responseBody?: unknown;

  constructor(message: string, status?: number, responseBody?: unknown) {
    super(message);
    this.name = "AirConnectRestError";
    this.status = status;
    this.code = message;
    this.responseBody = responseBody;
  }
}

export class AirConnectQuotationRestClient {
  private readonly http: AxiosInstance;
  private readonly apiPrefix: string;

  constructor(options: AirConnectQuotationRestClientOptions) {
    if (!options.baseUrl) {
      throw new Error("baseUrl is required");
    }

    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }

    this.apiPrefix = normalizePath(options.apiPrefix || "/api");
    this.http = axios.create({
      baseURL: options.baseUrl.replace(/\/+$/, ""),
      timeout: options.timeoutMs || 30000,
      headers: {
        ...options.headers,
        "X-Api-Key": options.apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async calculateQuotation<TQuotation = Quotation>(
    input: CalculateQuotationInput,
    options?: { quotationId?: string }
  ): Promise<TQuotation> {
    if (options?.quotationId) {
      return this.updateQuotation<TQuotation>(options.quotationId, input);
    }

    return this.createQuotation<TQuotation>(input);
  }

  async createQuotation<TQuotation = Quotation>(
    input: CalculateQuotationInput
  ): Promise<TQuotation> {
    return this.request<TQuotation>({
      method: "post",
      url: this.path("/quotations/calculate"),
      data: input,
    });
  }

  async updateQuotation<TQuotation = Quotation>(
    quotationId: string,
    input: CalculateQuotationInput
  ): Promise<TQuotation> {
    return this.request<TQuotation>({
      method: "put",
      url: this.path(`/quotations/${encodeURIComponent(quotationId)}/calculate`),
      data: input,
    });
  }

  async confirmQuotation<TQuotation = Quotation>(
    quotationId: string,
    input: ConfirmQuotationInput
  ): Promise<TQuotation> {
    return this.request<TQuotation>({
      method: "post",
      url: this.path(`/quotations/${encodeURIComponent(quotationId)}/confirm`),
      data: input,
    });
  }

  async updateQuotationStatusById<TQuotation = Quotation>(
    quotationId: string,
    input: UpdateQuotationStatusByIdInput
  ): Promise<TQuotation> {
    return this.request<TQuotation>({
      method: "put",
      url: this.path(`/quotations/${encodeURIComponent(quotationId)}/status`),
      data: input,
    });
  }

  async acceptQuotation<TQuotation = Quotation>(
    quotationId: string,
    version: number
  ): Promise<TQuotation> {
    return this.updateQuotationStatusById<TQuotation>(quotationId, {
      version,
      newStatus: "ACCEPTED",
    });
  }

  async rejectQuotation<TQuotation = Quotation>(
    quotationId: string,
    version: number
  ): Promise<TQuotation> {
    return this.updateQuotationStatusById<TQuotation>(quotationId, {
      version,
      newStatus: "REJECTED",
    });
  }

  async getQuotationById<TQuotation = Quotation>(
    quotationId: string
  ): Promise<TQuotation> {
    return this.request<TQuotation>({
      method: "get",
      url: this.path(`/quotations/${encodeURIComponent(quotationId)}`),
    });
  }

  async getQuotations<TQuotationShort = QuotationShort>(
    input: GetQuotationsInput = {}
  ): Promise<GetQuotationsResponse<TQuotationShort>> {
    return this.request<GetQuotationsResponse<TQuotationShort>>({
      method: "get",
      url: this.path("/quotations"),
      params: input,
    });
  }

  async deleteQuotation(
    quotationId: string,
    input: DeleteQuotationInput
  ): Promise<{ result: string }> {
    return this.request<{ result: string }>({
      method: "delete",
      url: this.path(`/quotations/${encodeURIComponent(quotationId)}`),
      params: { version: input.version },
    });
  }

  private path(pathname: string): string {
    return `${this.apiPrefix}${normalizePath(pathname)}`;
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.http.request<T>(config);
      return response.data;
    } catch (err) {
      throw toAirConnectRestError(err);
    }
  }
}

const normalizePath = (path: string): string => {
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
};

const toAirConnectRestError = (err: unknown): AirConnectRestError => {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError<RestErrorBody>;
    const status = axiosError.response?.status;
    const responseBody = axiosError.response?.data;
    const code = responseBody?.error || axiosError.message;

    return new AirConnectRestError(code, status, responseBody);
  }

  if (err instanceof Error) {
    return new AirConnectRestError(err.message);
  }

  return new AirConnectRestError("ERROR_UNKNOWN");
};
