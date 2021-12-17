# Circle Integration
Contains documentation, demo, and back/front end components required to integrate circle payments into a project.

## Todo

+ need to get mocha running via tasks

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