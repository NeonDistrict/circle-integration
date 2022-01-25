# Circle Integration
Contains documentation, demo, and back/front end components required to integrate circle payments into a project.

## Todo

+ parking cleanup for timeouts
+ need to verify notifications via aws docs or else anyone can post in there
+ we will get notifications for refunds and shit that need handling right now they will just park eternally
+ some payment errors should never be able to happen and should lock an account, not just quarantine it
+ card creation does avs too
+ waiting to hear back on teh 5.54 amount issue on slack from circle
+ waiting to hear back on the expiry validation issue
+ AVS test letters EKLO- all return Y erroneously, circle informed, waiting to hear back
+ need a process to clean up dead callbacks, and an endpoint to get purchases, it should check that the users auth owns that purchase
+ need deep logging by uuid
+ if they player does some stupid back/forward stuff around redirects we should get the latest purchase or started purchase on all pages just to make sure theyre not duplicating
+ when the server starts if its gets any sns notifications right now i think it just dumps them, it should really be treating them correctly by updating things
+ looks like 3ds calls back with `paymentId=` in the query string which is great
+ we do get a notification of the confirmed even though the player isnt attached waiting for a callback, we can use this to update the account. need to hook these notifications so they get processed and not parking gets cleaned up or maybe user makes request to server after to get it? 5m timeout or somethibng
+ there could also be a period check to address any missed connections in parking which would be an extremely rare race condition that should be reported when it happens
+ todo need to verify the behaviour if a call returns with success, and if a notification comes in for an already resolved situation which may or may not have a callback parked. a periodic sweep should also check if calls are already resolved and dismiss them, this should also, be recorded. this will have to against the db
+ todo handle callback timeouts (like the callback never comes)
+ todo handle the request ending before we can callback, handle dead request trying to respond?
+ when a server comes up it should look at the db for anything that was left hanging or unresolved and query circle for it (this should actually happen periodically)
+ update notion
+ log the idempotency key that comes from the client and ensure it has no collisions, collisions should be flagged as malicious
+ server generated idempotency keys should be checked for collisions before being used
+ client provided uuid need to be unique checked
+ if we are going to just bounce invalid requests, we need to log and dashboard those, ip tracking
+ there should be safe guards in the where clause sql to only allow specific state transitions, ie a purchase cant go from failed to pending, and a cvv cant go into request unless 3ds is unavailable, this will prevent dissallowed transitions
+ some enums might not be getting used, they should all be somewhere..
+ postgres lib errors should come back as generic internal error but log in full
+ all errors should log in full but return only useful info for user
+ part of the parking cleanup or possible another daemon should be to look at the db for any unfinished purchases and poll circle for resolutions on them
+ uh after 3ds redirect is good or bad, the client prol needs to query the server to confirm things finished?
+ we may not be able to store cvv at all, so check on that shit
+ logs need to be somehow slow queryable by uuid, maybe we use date stamps to find a region, load that region then slow sweep to find enetires
+ mark fraud should also mark it on the user
+ a user marked fraud cannot to anything, check user for fraud before processing
+ report fatal errors

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