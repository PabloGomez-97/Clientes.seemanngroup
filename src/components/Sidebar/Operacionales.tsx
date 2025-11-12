import { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// Define types for our shipping order data
interface Address {
  id: number;
  name: string;
  accountNumber: string | null;
  code: string;
  scacNumber: string | null;
  iataCode: string | null;
  identificationNumber: string | null;
  email: string | null;
  primaryAddress: string | null;
  billingAddress: string | null;
  phone: string | null;
  addresses: any[];
  ownerId: string | null;
}

interface TotalCargo {
  pieces: number;
  value: number;
  containers: number;
  declaredValue: number;
  weightValue: number;
  weightUOM: number;
  volumeValue: number;
  volumeUOM: number;
  volumeWeightValue: number;
  volumeWeightUOM: number;
}

interface ShippingOrder {
  id: number;
  number: string;
  customerReference: string | null;
  departureDate: string | null;
  arrivalDate: string | null;
  cutOffDate: string | null;
  operationFlow: number;
  modeOfTransportation: string | null;
  carrier: Address | null;
  shipper: Address;
  shipperAddress: string;
  consignee: Address;
  consigneeAddress: string;
  forwardingAgent: Address | null;
  destinationAgent: Address | null;
  orderDate: string;
  totalCargo: TotalCargo;
  commodities: any[];
  charges: any[];
}

interface ShippingOrdersResponse {
  shippingOrders: {
    items: ShippingOrder[];
  };
}

const Reporteria: React.FC = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([]);
  const [userOrders, setUserOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShippingOrders = async () => {
      try {
        if (!accessToken) {
          onLogout();
          return;
        }

        const response = await fetch('https://api.linbis.com/api/shipping-orders?PageNumber=1&PageSize=3324', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            onLogout();
            return;
          }
          throw new Error(`API Error: ${response.status}`);
        }

        const data: ShippingOrdersResponse = await response.json();
        
        if (data && data.shippingOrders && data.shippingOrders.items) {
          // Store all orders
          setShippingOrders(data.shippingOrders.items);
          
          // Filter by consignee NAME instead of ID
          if (user?.username) {
            const userSpecificOrders = data.shippingOrders.items.filter(order => 
              order.consignee && order.consignee.name === user.username
            );
            setUserOrders(userSpecificOrders);
          } else {
            // If no username available, just show all orders
            setUserOrders(data.shippingOrders.items);
          }
        } else {
          throw new Error('Invalid data format received from API');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error fetching shipping orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShippingOrders();
  }, [accessToken, onLogout, user]);

  // Helper function to get status badge color based on operationFlow
  const getStatusBadge = (operationFlow: number) => {
    switch (operationFlow) {
      case 1:
        return <Badge bg="primary">Export</Badge>;
      case 2:
        return <Badge bg="success">Import</Badge>;
      case 3:
        return <Badge bg="info">Transit</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Helper function to format weight with UOM
  const formatWeight = (weight: number, uom: number) => {
    const unit = uom === 2 ? 'kg' : 'lb';
    return `${weight.toLocaleString()} ${unit}`;
  };

  // Helper function to format volume with UOM
  const formatVolume = (volume: number, uom: number) => {
    const unit = uom === 2 ? 'm³' : 'ft³';
    return `${volume.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${unit}`;
  };

  // Format date directly without external utility
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  return (
    <Container fluid className="mt-4">
      <h2>Shipping Operations Reports</h2>

      {/* Loading state */}
      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {/* Results count */}
      {!loading && !error && (
        <div className="mb-3">
          <p>Showing {userOrders.length} shipping orders</p>
        </div>
      )}

      {/* Shipping order cards */}
      <Row xs={1} md={2} lg={3} className="g-4">
        {userOrders.map(order => (
          <Col key={order.id}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">{order.number}</span>
                {getStatusBadge(order.operationFlow)}
              </Card.Header>
              <Card.Body>
                <Card.Title>
                  {order.consignee?.name || 'No Consignee'}
                </Card.Title>
                <Card.Text>
                  <small className="text-muted">
                    {order.customerReference ? `Ref: ${order.customerReference}` : 'No reference'}
                  </small>
                </Card.Text>
                
                <hr />
                
                <div className="mb-2">
                  <strong>Shipper:</strong> {order.shipper?.name || 'N/A'}
                </div>
                
                {order.carrier && (
                  <div className="mb-2">
                    <strong>Carrier:</strong> {order.carrier.name}
                  </div>
                )}
                
                <div className="d-flex justify-content-between mb-2">
                  <div>
                    <strong>Departure:</strong><br />
                    {formatDate(order.departureDate)}
                  </div>
                  <div>
                    <strong>Arrival:</strong><br />
                    {formatDate(order.arrivalDate)}
                  </div>
                </div>
                
                <hr />
                
                <Row className="mb-2 text-center">
                  <Col xs={4}>
                    <small className="d-block fw-bold">Pieces</small>
                    <span>{order.totalCargo.pieces}</span>
                  </Col>
                  <Col xs={4}>
                    <small className="d-block fw-bold">Weight</small>
                    <span>{formatWeight(order.totalCargo.weightValue, order.totalCargo.weightUOM)}</span>
                  </Col>
                  <Col xs={4}>
                    <small className="d-block fw-bold">Volumen</small>
                    <span>{formatVolume(order.totalCargo.volumeValue, order.totalCargo.volumeUOM)}</span>
                  </Col>
                  <Col xs={4}>
                    <small className="d-block fw-bold">Volume Weight Value</small>
                    <span>{formatVolume(order.totalCargo.volumeWeightValue, order.totalCargo.volumeUOM)}</span>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer className="text-muted">
                <small>Order Date: {formatDate(order.orderDate)}</small>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {/* No results message */}
      {!loading && !error && userOrders.length === 0 && (
        <Alert variant="info">
          No shipping orders found for your account.
        </Alert>
      )}
    </Container>
  );
};

export default Reporteria;