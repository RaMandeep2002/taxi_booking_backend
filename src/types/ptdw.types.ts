export interface PTDWConfig {
    ptNumber: string;
    uuid: string;
    sharedKey: string;
    publicKey: string;
    apiUrl: string;
}

export interface JWTPayload {
    iss: string;
    sub: string;
    uuid: string;
    ptnum: string;
    created: string;
    osv: string;
}
export interface PTDWRequest {
    PTNo: string;
    XMLData: string;
    StartDate: string;
    EndDate: string;
  }
export interface PTDWResponse {
    'Status code': number;
    Reason: string;
    Response: {
        sid: string;
        error: string;
    }
}

export interface SubmissionResult {
    success: boolean;
    statusCode?: number;
    submissionId?: string;
    message?: string;
    error?: string;
}


export interface CSVRowData {
    PTNo: string;
    NSCNo: string;
    SvcTypCd: string;
    StartDt: string;
    EndDt: string;
    ShiftID: string;
    VehRegNo: string;
    VehRegJur: string;
    DriversLicNo: string;
    DriversLicJur: string;
    ShiftStartDT: string;
    ShiftEndDT: string;
    TripID: string;
    TripTypeCd: string;
    TripStatusCd: string;
    VehAssgnmtDt: string;
    VehAssgnmtLat: string;
    VehAssgnmtLng: string;
    PsngrCnt: string;
    TripDurationMins: string;
    TripDistanceKMs: string;
    TtlFareAmt: string;
    PickupArrDt: string;
    PickupDepDt: string;
    PickupLat: string;
    PickupLng: string;
    DropoffArrDt: string;
    DropoffDepDt: string;
    DropoffLat: string;
    DropoffLng: string;
}
