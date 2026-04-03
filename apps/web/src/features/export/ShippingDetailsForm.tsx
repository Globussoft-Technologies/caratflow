'use client';

interface ShippingDetailsFormProps {
  preCarriageBy: string;
  onPreCarriageByChange: (v: string) => void;
  placeOfReceipt: string;
  onPlaceOfReceiptChange: (v: string) => void;
  vesselFlightNo: string;
  onVesselFlightNoChange: (v: string) => void;
  portOfLoading: string;
  onPortOfLoadingChange: (v: string) => void;
  portOfDischarge: string;
  onPortOfDischargeChange: (v: string) => void;
  finalDestination: string;
  onFinalDestinationChange: (v: string) => void;
}

export function ShippingDetailsForm(props: ShippingDetailsFormProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase">Shipping Details</h4>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Pre-Carriage By</label>
          <input type="text" value={props.preCarriageBy} onChange={(e) => props.onPreCarriageByChange(e.target.value)} placeholder="Road / Rail" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Place of Receipt</label>
          <input type="text" value={props.placeOfReceipt} onChange={(e) => props.onPlaceOfReceiptChange(e.target.value)} placeholder="JNPT Mumbai" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Vessel / Flight No.</label>
          <input type="text" value={props.vesselFlightNo} onChange={(e) => props.onVesselFlightNoChange(e.target.value)} placeholder="MAEU-2604-XYZ" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Port of Loading</label>
          <input type="text" value={props.portOfLoading} onChange={(e) => props.onPortOfLoadingChange(e.target.value)} placeholder="Nhava Sheva, Mumbai" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Port of Discharge</label>
          <input type="text" value={props.portOfDischarge} onChange={(e) => props.onPortOfDischargeChange(e.target.value)} placeholder="Port of New York" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Final Destination</label>
          <input type="text" value={props.finalDestination} onChange={(e) => props.onFinalDestinationChange(e.target.value)} placeholder="New York, USA" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
      </div>
    </div>
  );
}
