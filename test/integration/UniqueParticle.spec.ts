import 'mocha'
import { expect } from 'chai'

import Decimal from 'decimal.js'
import BN from 'bn.js'
import axios from 'axios'

import {
  radixUniverse,
  radixTokenManager,
  logger,
  RadixUniverse,
  RadixIdentityManager,
  RadixTransactionBuilder,
  RadixAccount,
  RadixLogger,
  RadixTokenDefinition,
} from '../../src'


const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-392: RadixUniqueParticle', () => {
    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()
    const identity2 = identityManager.generateSimpleIdentity()

    const testTokenRef = `/${identity1.account.getAddress()}/tokens/UNIQ`

    before(async () => {
        logger.setLevel('error')

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        await identity1.account.openNodeConnection()


        // Create token

        const symbol = 'UNIQ'
        const name = 'UNIQ test'
        const description = 'my token description'
        const granularity = new BN(1)
        const amount = 1000

        await new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
        )
        .signAndSubmit(identity1)
        .toPromise()
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
    })

    it('(1) should create an atom with a unique id', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique1')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('TODO: it should fail when submitting a unique particle for an unowned account', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity2.account, 'unique1')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(2) should fail submitting an atom with a conflicing unique id', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique1')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done('Should have failed')
            },
            error: e => {
                expect(e).to.contain('unique require compromised')
                done()
            },
        })
    })

    it('(3) should succeed submitting an atom with multiple unique ids', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique2')
        .addUniqueParticle(identity1.account, 'unique3')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                // Check balance
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(4) should fail submitting an atom with multiple conflicing unique ids', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique4')
        .addUniqueParticle(identity1.account, 'unique4')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done('Should have failed')
            },
            error: e => {
                expect(e).to.contain('unique require compromised')
                done()
            },
        })
    })

    it('(5) should observe uniques in transfer system', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique5')
        .addUniqueParticle(identity1.account, 'unique6')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                
                const unique = [
                    `/${identity1.account.getAddress()}/unique/unique5`,
                    `/${identity1.account.getAddress()}/unique/unique6`,
                ]
                
                expect(identity1.account.transferSystem.transactions.values().map(t => t.unique))
                    .to.deep.include(unique)

                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

})
