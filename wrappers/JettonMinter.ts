import { crc32 } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
    type Address,
    type Contract,
    type ContractProvider,
    type Sender,
    Cell,
    Dictionary,
    SendMode,
    beginCell,
    contractAddress,
} from '@ton/core';

const SNAKE_PREFIX = 0x00;
const ONCHAIN_CONTENT_PREFIX = 0x00;
const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

export type JettonMinterContent = {
    uri: string;
};

export type JettonMinterConfig = {
    immediateAdmin: Address;
    timeLockedAdmin: Address;
    walletCode: Cell;
    jettonContent: Cell | JettonMinterContent;
};

const sha256 = (data: string) => createHash('sha256').update(data).digest();

const toKey = (key: string) => {
    return BigInt(`0x${sha256(key).toString('hex')}`);
};

function bufferToChunks(buff: Buffer, chunkSize: number) {
    const chunks: Buffer[] = [];

    while (buff.byteLength > 0) {
        chunks.push(buff.subarray(0, chunkSize));
        buff = buff.subarray(chunkSize);
    }

    return chunks;
}

export function makeSnakeCell(data: Buffer) {
    const chunks = bufferToChunks(data, CELL_MAX_SIZE_BYTES);

    const b = chunks.reduceRight((curCell, chunk, index) => {
        if (index === 0) {
            curCell.storeInt(SNAKE_PREFIX, 8);
        }

        curCell.storeBuffer(chunk);
        if (index > 0) {
            const cell = curCell.endCell();
            return beginCell().storeRef(cell);
        }

        return curCell;
    }, beginCell());
    return b.endCell();
}

export function buildOnchainMetadata(data: {
    name: string;
    description: string;
    image: string;
    symbol: string;
    decimals: number;
}): Cell {
    let dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    Object.entries(data).forEach(([key, value]) => {
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value.toString(), 'utf8')));
    });

    return beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
}

export function jettonContentToCell(content: JettonMinterContent) {
    return beginCell().storeStringRefTail(content.uri).endCell();
}

export function jettonMinterConfigToCell(config: JettonMinterConfig): Cell {
    const content =
        config.jettonContent instanceof Cell ? config.jettonContent : jettonContentToCell(config.jettonContent);

    const adminAddresses = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
    adminAddresses.set(
        crc32('immediate_admin_addresses'),
        beginCell().storeAddress(config.immediateAdmin).storeAddress(null).endCell(),
    );
    adminAddresses.set(
        crc32('time_locked_admin_addresses'),
        beginCell().storeAddress(config.timeLockedAdmin).storeAddress(null).endCell(),
    );

    return beginCell()
        .storeCoins(0)
        .storeDict(adminAddresses)
        .storeRef(config.walletCode)
        .storeRef(content)
        .storeDict(Dictionary.empty())
        .storeUint(0, 64)
        .endCell();
}

export class JettonMinter implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new JettonMinter(address);
    }

    static createFromConfig(config: JettonMinterConfig, code: Cell, workchain = 0) {
        const data = jettonMinterConfigToCell(config);
        const init = { code, data };
        return new JettonMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0xd372158c, 32).storeUint(0, 64).endCell(),
        });
    }
}
