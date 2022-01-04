# Circle Integration
Contains documentation, demo, and back/front end components required to integrate circle payments into a project.

## Todo

+ ensure all error responses from server are of the same form
+ json schema validation
+ does adding card have redirect validation?
+ hash details on backend, client cant be trusted to make their own hashes against themselves.. but we do need to hash card numbers soo?
+ parking cleanup for timeouts
+ when we send in session ids they should be one way hashed as to not send actual session ids as per circles documentation
+ need to verify notifications via aws docs or else anyone can post in there
+ we will get notifications for refunds and shit that need handling right now they will just park eternally
+ looks like cards come back with a finger print? maybe we can use that as a prepayment check? since we need to create the card to get it
+ public key changed flow for client/server
+ public key encryption of all details on front, then hashing of those on back
+ drop error reason, just do message
+ some payment errors should never be able to happen and should lock an account, not just quarantine it
+ card creation does avs too
+ there is a number of scenarios where a dev should be notified
+ waiting to hear back on teh 5.54 amount issue on slack from circle
+ waiting to hear back on the expiry validation issue
+ AVS test letters EKLO- all return Y erroneously, circle informed, waiting to hear back
+ idempotency key reuse is allowed on sandbox, reported to circle waiting to hear back
+ need a process to clean up dead callbacks, and an endpoint to get purchases, it should check that the users auth owns that purchase
+ need deep logging by uuid
+ need json schema validation on calls
+ what does the body parser do on non json or bad json bodies?
+ can we impose a body size limit to prevent heap fill atatcks
+ need sessions and session hashes
+ http_server needs listeners for on.error
+ use strict equal for asserts to get better logs
+ do a test where we success encrypt the data, then mess up the encrypted
+ we need to track the 3dsecure and cvv not available to allow the user to step down, otherwise they could just ask for no verirfication
+ purchases should send two idempotency keys from the frontend one for card one for payment, server shouldnt create
+ if they player does some stupid back/forward stuff around redirects we should get the latest purchase or started purchase on all pages just to make sure theyre not duplicating
+ when the server starts if its gets any sns notifications right now i think it just dumps them, it should really be treating them correctly by updating things
+ schema to check for verification type and force refresh
+ looks like 3ds calls back with `paymentId=` in the query string which is great
+ we do get a notification of the confirmed even though the player isnt attached waiting for a callback, we can use this to update the account. need to hook these notifications so they get processed and not parking gets cleaned up or maybe user makes request to server after to get it? 5m timeout or somethibng

flow:

call purchase -> get one of {error: whatever}, {redirect: urlfor3dsecure}

## Useful Links

+ [Circle Homepage](https://www.circle.com/en/)
+ [Circle Payments API Documentation](https://developers.circle.com/docs/accept-card-payments-online)
+ [Neon District Circle Integration Dev Server: 54.211.86.53](54.211.86.53) 54.211.86.53

## Setting up an EC2 Instance

1. Create an amazon linux ec2 instance
1. SSH in
1. Install dependencies using yum

```
sudo yum groupinstall 'Development Tools' -y
sudo curl --silent --location https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install nodejs -y
sudo npm install pm2 -g
```

## Configuring deployment

1. Create an elastic IP and point it at the ec2 instance
1. In Route53 setup a subdomain and point it at the elastic IP
1. Use let's encrypt to acquire an ssl certificate for the subdomain using manual DNS verification
1. Place `fullchain.pem` and `privkey.pem` in a directory `keys` in the root of project

## Setting up your local workspace

1. Install VS Code
1. Install the `Remote - SSH` extension for VS Code
1. In the bottom left corner of VS Code is a small green icon, click on this icon
1. Select `Connect to host`
1. Select `Add new SSH Host`
1. Enter the SSH connection string for the ec2 instance, such as: `ssh -i ~/keys/neon-district-circle-integration-dev.pem ec2-user@69.69.69.69`
1. Select your user's SSH config to be updated, such as `/home/adrian/.ssh/config`
1. You are now setup for SSH remote working via VS Code, click the small green icon in the bottom left again to connect to the ec2 instance
1. Sometimes the SSH connection can get _droppy_ you can restart the SSH daemon on the ec2 instance with `sudo systemctl restart sshd` which allegedly helps

## Connecting Git

1. While connected to the ec2 instance, run `ssh-keygen -t rsa -b 4096 -C "your@email.com"` to generate an SSH keypair
1. Ensure that you add a passphrase to this keypair, otherwise if the machine is comprimised so will your git access
1. Run `cat ~/.ssh/id_rsa.pub` to output the public key to the terminal, which can then be copied to the clipboard
1. Add this public key to your github SSH keys
1. You can now interact with git from the ec2 instance

## Running and Tests

A VS Code `launch.json` is included in the project, simply select `Launch Program` or `Mocha Tests` from the `Run and Debug` dropdown to run either with full debug support. Alternatively the server can be run directly from the terminal with `node ./src/index.js` or via pm2 with `pm2 start ./src/index.js`.

## Risk Mitigation

1. No card references are stored on our side, each time a player wants to make a payment they must enter the full card information and pass an MFA challenge.
2. The first payment a player makes is the most scrutinized, requiring email validation.
3. Card information is one way hashed for limit tracking across accounts, and to detect unusual behavior involving one card on multiple accounts.
4. Player limits are traked by account, and by card hashes. Neither may be exceeded.
5. Our maximum limits will always be well below circle's maximum limits.
6. Player limits are imposed in tranches, for example: the first tranche limit may be $10, 7 days after purchases in the first tranche, the next tranche is $25, 15 days after a purchase in the second trance they enter another where the limit is $100. A player does not enter the next tranche without spending in the previous. The numbers provided here are for example only and not reflective of actual values.
7. Any suspicious behaviour triggers a quarantine dissallowing payments on the account until an identity can be verified by a human (face matching government id matching the card).
8. All player meta information is tracked: browser info, ip address, device type, estimated ip location, access time/day, time in game before purchase, account age, failed login attempts, failed MFA challenges, bad card information, etc. Any changes or anomolies in this meta information may trigger quarantine for the account, the card used but on any account, and the ip address. If a card or ip address is quarantined and used on another account that account is also quarantined.
9. Whenever we detect fraud, or whenever circle detects fraud and informs us, or whenever there is a chargeback (contested and uncontested) - this information is aggregated along with all associated tracked metadata to form a risk filter, whereby we may automatically choose to: outright deny payments, impose special lower limits, impose quarantine processes for every payment, or instigate human investigation whereby circle or the associated card providing company are brought into a discussion surrounding the case. This aggregated information will also be used retroactively to develop better early detection methods, and to design a more concise user experience increasing the contestability of chargebacks when they do occur and ensuring the player understands what they are purchasing at the point of sale.
10. Players do not purchase NFTs, they purchase in-game currency, which is not a blockchain token or asset. This in-game currency can be used to buy in-game items or improve items in the game. Currently, these in-game items are minted as NFTs automatically, however we will in the next month or two be moving to an on-demand process, in which a player chooses to move that item out of game, it is minted and an NFT is created. This provides us the ability to prevent the minting of NFTs by a player as a type of "hold" on their account after a purchase is made for a set amount of time. For example 10 days after a purchase that account cannot mint NFTs unless the player is willing to verify their identity for the purchase.
11. Using more than three different cards on an account will cause an account and all associated cards to go into quarantine, as well as using any card with a different name or address then other cards already used on the account (as determined by matching one way hashes).
12. In the event of a high number of risk detections in a particular period the quantification of risk filtering and meta infromation discrepencies become more aggressive until the risk detections frequency drops back down below a set threshold. This is used as a means to detect and mitigate large scale events spanning multiple new or existing accounts involving stolen cards.
13. All sensitive information is stored in one way hashes meaning a full database comprimise would yield no fruit.
14. No Circle card references are stored on our servers meaning a comprimised server could not be used to make purchases on behalf of a player.