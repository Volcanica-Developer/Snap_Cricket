export class TokenManager {
    private validTokens: Set<number> = new Set();
    private incrementalToken: number = 0;

    generateToken(): number {
        const generatedToken = this.incrementalToken;
        this.validTokens.add(generatedToken);
        this.incrementalToken += 1;
        return generatedToken;
    }

    isTokenValid(token: number): boolean {
        return this.validTokens.has(token);
    }

    dismissToken(token: number): void {
        if (token === null) {
            return;
        }
        this.validTokens.delete(token);
    }
}
