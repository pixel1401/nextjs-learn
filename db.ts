import { neonConfig } from '@neondatabase/serverless';
import { NeonDialect } from "kysely-neon";
import { Kysely } from "kysely";

    neonConfig.wsProxy = (host) => `${host}:54330/v1`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;


export const db = new Kysely({
    dialect: new NeonDialect({
        connectionString: process.env.POSTGRES_URL,
    }),
});