// Dummy invoice data for MundoGaming demo account
// 3 invoices: paid, pending, overdue

export interface DummyInvoice {
  id?: number;
  number?: string;
  type?: number;
  date?: string;
  dueDate?: string;
  status?: number;
  billTo?: {
    name?: string;
    identificationNumber?: string;
  };
  billToAddress?: string;
  currency?: {
    abbr?: string;
    name?: string;
  };
  amount?: {
    value?: number;
    userString?: string;
  };
  taxAmount?: {
    value?: number;
    userString?: string;
  };
  totalAmount?: {
    value?: number;
    userString?: string;
  };
  balanceDue?: {
    value?: number;
    userString?: string;
  };
  charges?: Array<{
    description?: string;
    quantity?: number;
    unit?: string;
    rate?: number;
    amount?: number;
  }>;
  shipment?: {
    number?: string;
    waybillNumber?: string;
    consignee?: {
      name?: string;
    };
    departure?: string;
    arrival?: string;
    customerReference?: string;
  };
  paymentTerm?: {
    name?: string;
  };
  notes?: string;
  [key: string]: any;
}

export const MUNDOGAMING_DUMMY_INVOICES: DummyInvoice[] = [

  // ── Invoice 2: PENDING (balanceDue > 0, dueDate in future) ──
  {
    id: 990001,
    number: "INV-990002",
    type: 1,
    date: "2026-01-20T00:00:00",
    dueDate: "2027-03-20T00:00:00",
    status: 2,
    billTo: {
      name: "MUNDOGAMING SPA",
      identificationNumber: "77.123.456-7",
    },
    billToAddress: "Av. Providencia 1234, Oficina 501, Santiago, Chile",
    currency: {
      abbr: "CLP",
      name: "US Dollar",
    },
    amount: {
      value: 4200.0,
      userString: "4,200.00",
    },
    taxAmount: {
      value: 798.0,
      userString: "798.00",
    },
    totalAmount: {
      value: 4998.0,
      userString: "4,998.00",
    },
    balanceDue: {
      value: 0,
      userString: "0.00",
    },
    charges: [
      {
        description: "AIR FREIGHT",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 2500.0,
        amount: 2500.0,
      },
      {
        description: "HANDLING FEE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 400.0,
        amount: 400.0,
      },
      {
        description: "INSURANCE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 650.0,
        amount: 650.0,
      },
      {
        description: "CUSTOMS CLEARANCE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 400.0,
        amount: 400.0,
      },
      {
        description: "DOCUMENTATION FEE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 250.0,
        amount: 250.0,
      },
    ],
    shipment: {
      number: "SOG0008289",
      waybillNumber: "957-54329876",
      consignee: {
        name: "MUNDOGAMING SPA",
      },
      departure: "Shenzhen, China",
      arrival: "Santiago, Chile",
      customerReference: "MG-AIR-2026-001",
    },
    paymentTerm: {
      name: "Net 30",
    },
    notes:
      "008289@https://s3.us-east-1.amazonaws.com/mundogaming-docs/invoice-50002.pdf",
  },

  {
    id: 990002,
    number: "INV-990002",
    type: 1,
    date: "2026-01-20T00:00:00",
    dueDate: "2027-03-20T00:00:00",
    status: 1,
    billTo: {
      name: "MUNDOGAMING SPA",
      identificationNumber: "77.123.456-7",
    },
    billToAddress: "Av. Providencia 1234, Oficina 501, Santiago, Chile",
    currency: {
      abbr: "CLP",
      name: "US Dollar",
    },
    amount: {
      value: 4200.0,
      userString: "4,200.00",
    },
    taxAmount: {
      value: 798.0,
      userString: "798.00",
    },
    totalAmount: {
      value: 4998.0,
      userString: "4,998.00",
    },
    balanceDue: {
      value: 4998.0,
      userString: "4,998.00",
    },
    charges: [
      {
        description: "AIR FREIGHT",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 2500.0,
        amount: 2500.0,
      },
      {
        description: "HANDLING FEE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 400.0,
        amount: 400.0,
      },
      {
        description: "INSURANCE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 650.0,
        amount: 650.0,
      },
      {
        description: "CUSTOMS CLEARANCE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 400.0,
        amount: 400.0,
      },
      {
        description: "DOCUMENTATION FEE",
        quantity: 1,
        unit: "SHIPMENT",
        rate: 250.0,
        amount: 250.0,
      },
    ],
    shipment: {
      number: "SOG0009001",
      waybillNumber: "957-54329876",
      consignee: {
        name: "MUNDOGAMING SPA",
      },
      departure: "Shenzhen, China",
      arrival: "Santiago, Chile",
      customerReference: "MG-AIR-2026-001",
    },
    paymentTerm: {
      name: "Net 30",
    },
    notes:
      "50002@https://s3.us-east-1.amazonaws.com/mundogaming-docs/invoice-50002.pdf",
  },
];
