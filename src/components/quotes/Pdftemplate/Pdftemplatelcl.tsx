import React from 'react';

interface PDFTemplateProps {
  customerName: string;
  pol: string;
  pod: string;
  effectiveDate: string;
  expirationDate: string;
  incoterm: string;
  pickupFromAddress?: string;
  deliveryToAddress?: string;
  salesRep: string;
  pieces: number;
  packageTypeName: string;
  length: number;
  width: number;
  height: number;
  description: string;
  totalWeight: number;
  totalVolume: number;
  totalVolumeWeight: number;
  weightUnit: string;
  volumeUnit: string;
  charges: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
  totalCharges: number;
  currency: string;
}

export const PDFTemplateLCL: React.FC<PDFTemplateProps> = ({
  customerName,
  pol,
  pod,
  effectiveDate,
  expirationDate,
  incoterm,
  pickupFromAddress,
  deliveryToAddress,
  salesRep,
  pieces,
  packageTypeName,
  length,
  width,
  height,
  description,
  totalWeight,
  totalVolume,
  totalVolumeWeight,
  weightUnit,
  volumeUnit,
  charges,
  totalCharges,
  currency
}) => {
  return (
    <div id="pdf-content" style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10pt',
      color: '#000'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '3px solid #2c5aa0', paddingBottom: '10px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#2c5aa0', fontSize: '32pt', fontWeight: 'bold' }}>QUOTE</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9pt' }}>
          <img src="/logo.png" alt="Seemann Group" style={{ maxWidth: '150px', marginBottom: '10px' }} />
          <div><strong>Seemann y Compañia Limitada</strong></div>
          <div>Av. Libertad 1405, Oficina 1203</div>
          <div>Viña del Mar, Valparaiso 2520000</div>
          <div>CHILE</div>
          <div>Phone: +56226048385 // RUT 76.583.910-6</div>
          <div>contacto@seemanngroup.com</div>
          <div>https://seemanngroup.com</div>
        </div>
      </div>

      {/* Quote Number and Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#2c5aa0' }}>QUO000001</div>
        <div style={{ fontSize: '9pt' }}>
          <div><strong>Printed On:</strong> {new Date().toLocaleDateString()}</div>
          <div><strong>Printed By:</strong> {customerName}</div>
        </div>
      </div>

      {/* Customer and Additional Information */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        {/* Customer */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
          <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '5px', fontWeight: 'bold', marginBottom: '10px' }}>
            CUSTOMER
          </div>
          <div><strong>{customerName}</strong></div>
        </div>

        {/* Additional Information */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
          <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '5px', fontWeight: 'bold', marginBottom: '10px' }}>
            ADDITIONAL INFORMATION
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '9pt' }}>
            <div><strong>EFFECTIVE DATE:</strong></div>
            <div>{effectiveDate}</div>
            <div><strong>EXPIRATION DATE:</strong></div>
            <div>{expirationDate}</div>
            <div><strong>ORIGIN:</strong></div>
            <div>{pol}</div>
            <div><strong>DEST:</strong></div>
            <div>{pod}</div>
            <div><strong>INCOTERMS:</strong></div>
            <div>{incoterm}</div>
            {incoterm === 'EXW' && pickupFromAddress && (
              <>
                <div><strong>PICKUP FROM:</strong></div>
                <div style={{ fontSize: '8pt' }}>{pickupFromAddress}</div>
              </>
            )}
            {incoterm === 'EXW' && deliveryToAddress && (
              <>
                <div><strong>DELIVERY TO:</strong></div>
                <div style={{ fontSize: '8pt' }}>{deliveryToAddress}</div>
              </>
            )}
            <div><strong>TRANSIT DAYS:</strong></div>
            <div>5</div>
            <div><strong>SALES REP:</strong></div>
            <div>{salesRep}</div>
          </div>
        </div>
      </div>

      {/* Shipper and Consignee */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
          <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '5px', fontWeight: 'bold', marginBottom: '10px' }}>
            SHIPPER
          </div>
          <div style={{ minHeight: '60px' }}></div>
        </div>

        <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
          <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '5px', fontWeight: 'bold', marginBottom: '10px' }}>
            CONSIGNEE
          </div>
          <div><strong>{customerName}</strong></div>
        </div>
      </div>

      {/* Commodities Table */}
      <div style={{ marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c5aa0', color: 'white' }}>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>PIECES</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>PACKAGE</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>DIMENSIONS</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>DESCRIPTION</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>WEIGHT</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>VOLUME</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>VOL WEIGHT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>{pieces}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px' }}>{packageTypeName}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px' }}>{length} × {width} × {height} cm</td>
              <td style={{ border: '1px solid #ccc', padding: '5px' }}>{description}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{totalWeight.toFixed(3)} {weightUnit}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{totalVolume.toFixed(4)} {volumeUnit}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{totalVolumeWeight.toFixed(3)} {weightUnit}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ marginBottom: '20px', backgroundColor: '#f0f0f0', padding: '10px', fontSize: '9pt' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div><strong>PIECES:</strong> {pieces}</div>
          <div><strong>WEIGHT:</strong> {totalWeight.toFixed(3)} {weightUnit}</div>
          <div><strong>VOLUME:</strong> {totalVolume.toFixed(4)} {volumeUnit}</div>
        </div>
      </div>

      {/* Charges Table */}
      <div style={{ marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c5aa0', color: 'white' }}>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>CODE</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>DESCRIPTION</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>QTY</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>UNIT</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>RATE</th>
              <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((charge, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #ccc', padding: '5px' }}>{charge.code}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px' }}>{charge.description}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{charge.quantity.toFixed(3)}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>{charge.unit}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{charge.rate.toFixed(3)}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{charge.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Charges */}
      <div style={{ textAlign: 'right', marginBottom: '20px', fontSize: '12pt' }}>
        <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '10px', display: 'inline-block', minWidth: '250px' }}>
          <strong>TOTAL CHARGES ({currency}): {totalCharges.toFixed(2)}</strong>
        </div>
      </div>

      {/* Comments */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '5px', fontWeight: 'bold', marginBottom: '5px' }}>
          COMMENTS
        </div>
        <div style={{ border: '1px solid #ccc', padding: '10px', fontSize: '9pt' }}>
          <div><strong>Charges Applied:</strong></div>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {charges.map((charge, index) => (
              <li key={index}>
                {charge.description}: {charge.quantity.toFixed(3)} × {currency} {charge.rate.toFixed(2)} = {currency} {charge.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Terms */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '5px', fontWeight: 'bold', marginBottom: '5px' }}>
          TERMS
        </div>
        <div style={{ border: '1px solid #ccc', padding: '10px', fontSize: '8pt', lineHeight: '1.4' }}>
          Insure your cargo (FULL COVERAGE-ALL RISK) – Please ask our prices. Seemann y Compañia Limitada shall NOT be liable for any damages, delays or monetary loss of any type if you decided to not hire insurance. Equipment and space are subject to availability at the time of the booking. Reposition costs may apply. Rates do not include any additional services, unless specified in quote, and/or additional fees at either port of load or port of discharge, including but not limited to: inspections fees required by government agencies, X-ray, fumigation certificates, customs clearing charges, insurance, local taxes, terminal charges or other regulatory requirements by local agencies. Local port/crane charges etc. at both load and discharge ports are for the account of customer even if not specified in quote. Any/all Receiving/Wharfage/Terminal charges including but not limited to. Storage charges/washing charges will be for the account of customer and will be based upon the governing tariff of the relevant port(s) in effect at the time of shipment. All hazardous shipments are subject to approval. Ocean freight is subject to GRI & carrier's locals at destination. Tariff rates offered are subject to change without notice. Seemann y Compañia Limitada shall NOT be liable for any damages, delays or monetary loss of any type caused by: Acts of God or other Force Majeure Events; ie: weather delays, storms, floods, war, fires. LTL/FTL prices are valid for 7 days unless agreed in written.
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#666' }}>
        <div>Logistics Cloud Applications | www.linbis.com</div>
        <div>QuotationGeneralWithoutTax</div>
        <div>Page 1 of 1</div>
      </div>
    </div>
  );
};