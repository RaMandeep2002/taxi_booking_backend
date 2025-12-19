import { PTDWConfig } from "../types/ptdw.types";


interface Environment{
    production: PTDWConfig;
    test : PTDWConfig;
}

export const ptdwConfig : Environment ={
    production: {
        apiUrl: 'https://vsbc-api.th.gov.bc.ca/ptdw-api/api/ext/v1/submitdata/submitData',
        ptNumber: process.env.PTDW_PT_NUMBER || '70365',
        uuid: process.env.PTDW_UUID || '',
        sharedKey: process.env.PTDW_SHARED_KEY || '',
        publicKey: process.env.PTDW_PUBLIC_KEY || ''
      },
      test: {
        apiUrl: 'https://ect-vsbc-api.th.gov.bc.ca/ptdw-api/api/ext/v1/submitdata/submitData',
        ptNumber: process.env.PTDW_TEST_PT_NUMBER || '70365',
        uuid: process.env.PTDW_TEST_UUID || '',
        sharedKey: process.env.PTDW_TEST_SHARED_KEY || '',
        publicKey: process.env.PTDW_TEST_PUBLIC_KEY || ''
      }
}

export function getPTDWConfig(environment: 'production' | 'test' = 'production'): PTDWConfig {
    const config = ptdwConfig[environment];
    console.log(config)
    
    if (!config.ptNumber || !config.uuid || !config.sharedKey || !config.publicKey) {
      throw new Error(`Missing required PTDW configuration for ${environment} environment`);
    }
    
    return config;
  }