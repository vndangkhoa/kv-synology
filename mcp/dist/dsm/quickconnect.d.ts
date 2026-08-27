export declare function resolveQuickConnect(serverId: string): Promise<{
    host: string;
    port: number;
    isHttps: boolean;
} | null>;
export declare function testHostConnection(host: string, port: number, timeout?: number): Promise<boolean>;
export declare function isQuickConnectId(host: string): boolean;
export declare function parseHostInput(rawHost: string, rawPort: string, isHttps: boolean): {
    host: string;
    port: number;
    isHttps: boolean;
};
//# sourceMappingURL=quickconnect.d.ts.map