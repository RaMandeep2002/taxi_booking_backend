
import axios, { AxiosError } from 'axios';
// import * as jwt from 'jsonwebtoken';
import jwt, { JwtPayload } from "jsonwebtoken";
import { CSVRowData, JWTPayload, PTDWConfig, PTDWRequest, PTDWResponse, SubmissionResult } from "../types/ptdw.types";
import { CompactEncrypt, compactVerify, importSPKI, SignJWT } from 'jose';
import * as jose from "node-jose";

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
            // console.log(`📤 Preparing PTDW submission for ${startDate} to ${endDate}...`);
            // console.log(`📊 Total records: ${csvData.length}`);

            if (!csvData || csvData.length === 0) {
                throw new Error("No data to Submit");
            }

            this.validateDateFormat(startDate);
            this.validateDateFormat(endDate);
            this.validateDateRange(startDate, endDate);

            console.log('🔄 Converting CSV data to XML format...');
            const xmlData = this.convertCSVToXML(csvData, startDate, endDate);

            console.log("xml data -------------> ", xmlData)

            // Encode the XML data as base64 as required by the Trip Data Submission Guide (v1.3).
            // Convert the XMLData string to UTF-8 bytes, then to base64 for the PTDW "XMLData" field
            // To avoid logging the full XML or base64 string (which is very long), just log the sizes for debugging:
            const xmlBuffer = Buffer.from(xmlData, 'utf8');
            const base64xml = xmlBuffer.toString('base64');
            console.log(`[debug] XML length (bytes): ${xmlBuffer.length}, base64 length (bytes): ${base64xml.length}`);

            const sizeinMB = Buffer.byteLength(base64xml, "utf-8") / (1024 * 1024);
            // console.log(`📦 Xml file size : ${sizeinMB.toFixed(2)} MB`);

            if (sizeinMB > 500) {
                throw new Error(`Xml file size (${sizeinMB.toFixed(2)} MB) exceeds  500 MB limit`);
            }

            console.log('🔐 Generating authentication token...');
            const jweToken = await this.generateJweToken();

            const jwttoken = await this.genrateJwtToken();

            console.log("jwe token --------->", jweToken);

            console.log('🚀 Submitting to PTDW API...');
            const response = await this.callPTDWAPI(base64xml, startDate, endDate, jweToken);

            console.log(`☑️ PTDW subbmission Successful!`);

            return {
                success: true,
                statusCode: response.data['Status code'] || response.status,
                submissionId: response.data.Response?.sid || '',
                message: response.data.Reason || 'Success'
            };
        } catch (error) {
            console.error("PTDW submission failed:", error);

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<any>;
                return {
                    success: false,
                    statusCode: axiosError.response?.status || 500,
                    message: axiosError.response?.data?.Reason || axiosError.message,
                    error: axiosError.response?.data?.Response?.error || axiosError.message
                };
            }

            return {
                success: false,
                statusCode: 500,
                message: error instanceof Error ? error.message : "Unknown error",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }

    private convertCSVToXML(csvData: CSVRowData[], startDate: string, endDate: string): string {
        const currentDateTime = new Date().toISOString();

        const firstRow = csvData[0];

        const shiftsMap = new Map<string, CSVRowData[]>();

        csvData.forEach(row => {
            const shiftId = row.ShiftID;
            if (!shiftsMap.has(shiftId)) {
                shiftsMap.set(shiftId, []);
            }
            shiftsMap.get(shiftId)!.push(row);
        });

        const shiftsXML = Array.from(shiftsMap.entries()).map(([shiftId, trips]) => {
            const firstTrip = trips[0];

            const tripsXML = trips.map(trip => this.generateTripXML(trip)).join('\n');

            return `<Shift>
                ShiftID>${this.escapeXML(shiftId)}</ShiftID>
                VehRegNo>${this.escapeXML(firstTrip.VehRegNo)}</VehRegNo>
                VehRegJur>${this.escapeXML(firstTrip.VehRegJur)}</VehRegJur>
                DriversLicNo>${this.escapeXML(firstTrip.DriversLicNo)}</DriversLicNo>
                DriversLicJur>${this.escapeXML(firstTrip.DriversLicJur)}</DriversLicJur>
                ShiftStartDT>${this.escapeXML(firstTrip.ShiftStartDT)}</ShiftStartDT>
                ShiftEndDT>${this.escapeXML(firstTrip.ShiftEndDT)}</ShiftEndDT>
                <Trips>${tripsXML}</Trips>
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

        try {
            const jwtToken = await this.genrateJwtToken();

            const publicKey = await importSPKI(
                this.publickey.replace(/\\n/g, "\n"),
                "RSA-OAEP"
            );

            // 3️⃣ Encrypt JWT into JWE
            const jwe = await new CompactEncrypt(Buffer.from(jwtToken))
            .setProtectedHeader({ alg: "RSA-OAEP", enc: "A256GCM" })
            .encrypt(publicKey);
            console.log("jwe -----------> ", jwe)


            console.log("JWE Token (first 50 chars):", jwe.substring(0, 50) + "...");
            console.log("jwe > ", jwe)
            return jwe;
        }
        catch (error) {
            console.error("Error generating JWE token:", error);
            throw new Error(`JWE token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }



    /**
     * Generates a JWT signed with the shared key using the HS256 algorithm,
     * and encodes the token in Base64.
     */
    private async genrateJwtToken(): Promise<string> {
        console.log("<------------------------------------ generateJweToken ------------------------------------>");

        const now = new Date().toISOString();
        console.log("now ===============> ", now);

        const payload = {
            iss: "SALMON ARM TAXI (1978) LTD.",
            sub: "TripData",
            uuid: this.uuid,
            ptnum: this.ptNubmer,
            created: now,
            osv: Math.random().toString(36).substring(2, 10),
        };
        console.log("payload --------> ", payload)

        const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .sign(Buffer.from(this.sharedKey, "base64"));

        console.log("jwt > ", jwt)

        // return Buffer.from(jwtToken).toString('base64');
        return jwt;
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
        console.log("API URL:", this.apiurl);
        console.log("Request body (XML truncated):", {
            PTNo: requestBody.PTNo,
            XMLData: base64XML.substring(0, 50) + "... (" + base64XML.length + " chars)",
            StartDate: requestBody.StartDate,
            EndDate: requestBody.EndDate
        });

        // Generate curl command for debugging/logging
        const curlCommand = [
            "curl",
            "-X", "POST",
            `'${this.apiurl}'`,
            "--header", `'Authorization: Bearer ${jweToken}'`,
            "--header", "'Content-Type: application/json'",
            "--header", "'Accept': 'text/plain'",
            "-d", `'${JSON.stringify(requestBody)}'`
        ].join(' ');

        console.log("CURL Command for request:");
        console.log(curlCommand);

        try {
            const response = await axios.post<PTDWResponse>(
                this.apiurl,
                requestBody,  // axios will automatically stringify
                {
                    headers: {
                        'Authorization': `Bearer ${jweToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'text/plain'
                    },
                    timeout: 60000,  // 60 second timeout
                    validateStatus: (status) => status < 500  // Don't throw on 4xx errors
                }
            );
            console.log("Response ----------> ", response)
            console.log("Response Status:", response.status, response.statusText);
            console.log("Response Data:", response.data);

            return response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("API Error Response:", error.response?.data);
                console.error("API Error Status:", error.response?.status);
            }
            throw error;
        }
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

}

