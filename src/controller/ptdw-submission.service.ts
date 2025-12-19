
import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import * as jose from 'node-jose';
import { CSVRowData, JWTPayload, PTDWConfig, PTDWRequest, PTDWResponse, SubmissionResult } from "../types/ptdw.types";


export class PTDWSubmissionService {
    private readonly ptNubmer: string;
    private readonly uuid: string;
    private readonly sharedKey: string;
    private readonly publickey: string;
    private readonly apiurl: string;
    private readonly organizationName: string;

    constructor(config: PTDWConfig, organizationName: string = "Salmon Arm Taxis") {
        this.ptNubmer = config.ptNumber;
        this.uuid = config.uuid;
        this.sharedKey = config.sharedKey;
        this.publickey = config.publicKey;
        this.apiurl = config.apiUrl;
        this.organizationName = organizationName;
    }

    async submitCSVData(csvData: CSVRowData[], startDate: string, endDate: string): Promise<SubmissionResult> {
        try {
            console.log(`📤 Preparing PTDW submission for ${startDate} to ${endDate}...`);
            console.log(`📊 Total records: ${csvData.length}`);

            if (!csvData || csvData.length === 0) {
                throw new Error("No data to Submit")
            }

            this.validateDateFormat(startDate);
            this.validateDateFormat(endDate);
            this.validateDateRange(startDate, endDate);

            console.log('🔄 Converting CSV data to XML format...');
            const xmlData = this.convertCSVToXML(csvData, startDate, endDate);

            const base64xml = Buffer.from(xmlData, "utf-8").toString('base64');

            const sizeinMB = Buffer.byteLength(base64xml, "utf-8") / (1024 * 1024);
            console.log(`📦 Xml file size : ${sizeinMB.toFixed(2)} MB`);

            if (sizeinMB > 500) {
                throw new Error(`Xml file size (${sizeinMB.toFixed(2)} MB) exceeds  500 MB limit`);
            }

            console.log('🔐 Generating authentication token...');
            const jweToken = await this.generateJweToken();

            console.log("jwe token --------->", jweToken)

            console.log('🚀 Submitting to PTDW API...');
            const response = await this.callPTDWAPI(base64xml, startDate, endDate, jweToken);


            console.log(`☑️ PTDW subbmission Successful!`)

            return {
                success: true,
                statusCode: response.data['Status code'],
                submissionId: response.data.Response.sid,
                message: response.data.Reason
            }
        } catch (error) {
            console.log("Ptdw submission Failed: ", error);
            return this.handleError(error);
        }
    }

    private convertCSVToXML(csvData: CSVRowData[], startDate: string, endDate: string): string {
        const currentDateTime = new Date().toISOString();

        const firstRow = csvData[0];

        const shiftsMap = new Map<string, CSVRowData[]>();

        csvData.forEach(row => {
            const shiftId = row.ShiftID;
            if (!shiftsMap.has(shiftId)) {
                shiftsMap.set(shiftId, [])
            }
            shiftsMap.get(shiftId)!.push(row);
        })

        const shiftsXML = Array.from(shiftsMap.entries()).map(([shiftId, trips]) => {
            const firstTrip = trips[0];

            const tripsXML = trips.map(trip => this.generateTripXML(trip)).join('\n');

            return `    <Shift>
            <ShiftID>${this.escapeXML(shiftId)}</ShiftID>
            <VehRegNo>${this.escapeXML(firstTrip.VehRegNo)}</VehRegNo>
            <VehRegJur>${this.escapeXML(firstTrip.VehRegJur)}</VehRegJur>
            <DriversLicNo>${this.escapeXML(firstTrip.DriversLicNo)}</DriversLicNo>
            <DriversLicJur>${this.escapeXML(firstTrip.DriversLicJur)}</DriversLicJur>
            <ShiftStartDT>${this.escapeXML(firstTrip.ShiftStartDT)}</ShiftStartDT>
            <ShiftEndDT>${this.escapeXML(firstTrip.ShiftEndDT)}</ShiftEndDT>
            <Trips>
      ${tripsXML}
            </Trips>
          </Shift>`;
        }).join('\n');

        const xmlData = `<?xml version="1.0" encoding="utf-8"?>
          <PassengerTrip xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                         xsi:noNamespaceSchemaLocation="PassengerTrip.xsd">
            <Header>
              <UserID>${this.escapeXML(this.organizationName)}</UserID>
              <ApplicationID>TaxiDispatchSystem</ApplicationID>
              <PTNo>${firstRow.PTNo}</PTNo>
              <NSCNo>${firstRow.NSCNo}</NSCNo>
              <SvcTypCd>${firstRow.SvcTypCd}</SvcTypCd>
              <StartDt>${startDate}Z</StartDt>
              <EndDt>${endDate}Z</EndDt>
              <CreateDT>${currentDateTime}</CreateDT>
            </Header>
            <Shifts>
          ${shiftsXML}
            </Shifts>
          </PassengerTrip>`;


        return xmlData;

    }
    private generateTripXML(trip: CSVRowData): string {
        return `        <Trip>
              <TripID>${this.escapeXML(trip.TripID)}</TripID>
              <TripTypeCd>${this.escapeXML(trip.TripTypeCd)}</TripTypeCd>
              <TripStatusCd>${this.escapeXML(trip.TripStatusCd)}</TripStatusCd>
              <VehAssgnmtDt>${this.escapeXML(trip.VehAssgnmtDt)}</VehAssgnmtDt>
              <VehAssgnmtLat>${this.escapeXML(trip.VehAssgnmtLat)}</VehAssgnmtLat>
              <VehAssgnmtLng>${this.escapeXML(trip.VehAssgnmtLng)}</VehAssgnmtLng>
              <PsngrCnt>${this.escapeXML(trip.PsngrCnt)}</PsngrCnt>
              <TripDurationMins>${this.escapeXML(trip.TripDurationMins)}</TripDurationMins>
              <TripDistanceKMs>${this.escapeXML(trip.TripDistanceKMs)}</TripDistanceKMs>
              <TtlFareAmt>${this.escapeXML(trip.TtlFareAmt)}</TtlFareAmt>
              <PickupArrDt>${this.escapeXML(trip.PickupArrDt)}</PickupArrDt>
              <PickupDepDt>${this.escapeXML(trip.PickupDepDt)}</PickupDepDt>
              <PickupLat>${this.escapeXML(trip.PickupLat)}</PickupLat>
              <PickupLng>${this.escapeXML(trip.PickupLng)}</PickupLng>
              <DropoffArrDt>${this.escapeXML(trip.DropoffArrDt)}</DropoffArrDt>
              <DropoffDepDt>${this.escapeXML(trip.DropoffDepDt)}</DropoffDepDt>
              <DropoffLat>${this.escapeXML(trip.DropoffLat)}</DropoffLat>
              <DropoffLng>${this.escapeXML(trip.DropoffLng)}</DropoffLng>
            </Trip>`;
    }


    private escapeXML(str: string): string {
        if (!str || str === 'N/A') return str;
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }


    private async generateJweToken(): Promise<string> {
        const now = new Date().toISOString();
        console.log("Now ===> ", now);

        const payload: JWTPayload = {
            iss: this.organizationName,
            sub: "TripData",
            uuid: this.uuid,
            ptnum: this.ptNubmer,
            created: now,
            osv: this.generateOSV()
        }
        console.log("payload -------> ", payload);

        const signedJwt = jwt.sign(payload, this.sharedKey, {
            algorithm: "HS256",
            header: { alg: "HS256", typ: "JWT" }
        })
        console.log("signedJwt -------> ", signedJwt);

        let key;

        console.log("Public key ------- >", this.publickey);
        try {
            key = await jose.JWK.asKey(this.publickey, "pem");
            console.log("publicKey imported as JWK key ----->", key);
        } catch (err) {
            console.error("Failed to import public key as JWK:", err);
            throw new Error("Invalid PEM formatted public key.");
        }


        const jwe = await jose.JWE.createEncrypt(
            {
                format: 'compact',
                fields: { alg: 'RSA-OAEP', enc: 'A256GCM' }
            },
            key
        ).update(signedJwt).final()
        console.log("JWE token generated ----->", jwe);

        return jwe as string;
    }

    private generateOSV(): string {
        const timestamp = Date.now().toString();
        return timestamp.slice(-12).padStart(12, '0');
    }

    private async callPTDWAPI(
        base64XML: string,
        startDate: string,
        endDate: string,
        jweToken: string
    ) {
        const requestBody: PTDWRequest = {
            PTNo: this.ptNubmer,
            XMLData: base64XML,
            StartDate: startDate,
            EndDate: endDate
        };

        return await axios.post<PTDWResponse>(
            this.apiurl,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${jweToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain'
                },
                timeout: 60000
            }
        );
    }

    private validateDateFormat(date: string): void {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            throw new Error(`Invalid date format: ${date}. Expected format: YYYY-MM-DD`);
        }
    }


    private validateDateRange(startDate: string, endDate: string): void {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start > now || end > now) {
            throw new Error('Dates cannot be in the future');
        }

        if (start > end) {
            throw new Error('Start date cannot be after end date');
        }

        // const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        // if (daysDiff > 31) {
        //     throw new Error('Date range cannot exceed 31 days');
        // }

        // if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear()) {
        //     throw new Error('Date range cannot span multiple calendar months');
        // }
    }

    private handleError(error: unknown): SubmissionResult {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<PTDWResponse>;

            if (axiosError.response) {
                return {
                    success: false,
                    statusCode: axiosError.response.data?.['Status code'],
                    message: axiosError.response.data?.Reason,
                    error: axiosError.response.data?.Response?.error || axiosError.message
                };
            }
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

