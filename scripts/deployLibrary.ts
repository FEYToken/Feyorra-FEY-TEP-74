import { toNano } from '@ton/core';
import { type NetworkProvider, compile } from '@ton/blueprint';

import { Librarian } from '../wrappers/Librarian';

export async function run(provider: NetworkProvider) {
    const jettonWalletCode = await compile('JettonWallet');
    const librarianCode = await compile('Librarian');

    const librarian = provider.open(Librarian.createFromConfig({ code: jettonWalletCode }, librarianCode));
    await librarian.sendDeploy(provider.sender(), toNano('10'));
}
