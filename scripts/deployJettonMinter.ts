import { Address, toNano } from '@ton/core';
import { compile, type NetworkProvider } from '@ton/blueprint';

import { JettonMinter, buildOnchainMetadata } from '../wrappers/JettonMinter';

export async function run(provider: NetworkProvider) {
    const jettonWalletCodeRaw = await compile('JettonWallet');

    const minter = provider.open(
        JettonMinter.createFromConfig(
            {
                walletCode: jettonWalletCodeRaw,
                jettonContent: buildOnchainMetadata({
                    name: process.env.JETTON_NAME!,
                    description: process.env.JETTON_DESCRIPTION!,
                    symbol: process.env.JETTON_SYMBOL!,
                    image: process.env.JETTON_IMG_URL!,
                    decimals: Number(process.env.JETTON_DECIMALS),
                }),
                immediateAdmin: Address.parse(process.env.JETTON_IMMEDIATE_OWNER!),
                timeLockedAdmin: Address.parse(process.env.JETTON_TIME_LOCKED_OWNER!),
            },
            await compile('JettonMinter'),
        ),
    );

    await minter.sendDeploy(provider.sender(), toNano('1.5'));
}
