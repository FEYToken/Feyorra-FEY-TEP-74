import {
    type Address,
    type Cell,
    type Contract,
    type ContractProvider,
    type Sender,
    SendMode,
    contractAddress,
} from '@ton/core';

export type LibrarianConfig = {
    code: Cell;
};

export function librarianConfigToCell(config: LibrarianConfig): Cell {
    return config.code;
}

export class Librarian implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    static createFromAddress(address: Address) {
        return new Librarian(address);
    }

    static createFromConfig(config: LibrarianConfig, code: Cell, workchain = -1) {
        const data = librarianConfigToCell(config);
        const init = { code, data };
        return new Librarian(contractAddress(workchain, init), init);
    }
}
