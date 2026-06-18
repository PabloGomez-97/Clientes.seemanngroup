export type ShipmentMetaItem = {
  label: string;
  value: string;
  emphasis?: boolean;
};

interface ShipmentMetaStripProps {
  items: ShipmentMetaItem[];
}

function ShipmentMetaStrip({ items }: ShipmentMetaStripProps) {
  const visibleItems = items.filter((item) => item.value && item.value !== "—");

  if (visibleItems.length === 0) return null;

  return (
    <div className="sg-meta-strip">
      {visibleItems.map((item) => (
        <div
          key={item.label}
          className={`sg-meta-row${item.emphasis ? " sg-meta-row--emphasis" : ""}`}
        >
          <span className="sg-meta-row-label">{item.label}</span>
          <span className="sg-meta-row-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default ShipmentMetaStrip;
