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

1. no card references are stored on our side, each time a player wants to make a payment they must enter the full card information and pass an MFA challenge
2. the first payment a player makes is the most scrutinized, requiring email validation as well
3. card information is one way hashed for limit tracking across acounts, and to detect unusual behavior involving one card on multiple accounts
4. player limits are traked by account, and by card hashes; neither may be exceeded
5. our maximum limits will always be well below circle's maximum limits
6. player limits are imposed in tranches eg; first purchases may only be $10, 7 days after this purchase the next tranche is $25, 15 days after that purchase $100. A player does not enter the next tranche without spending the maximum in the previous.
7. any suspicious behaviour triggers a quarantine dissallowing payments until an identity can be verified by a human (government id matching the card).
8. all player meta information is tracked: browser info, ip address, device type, estimated ip location, access time/day, failed login attempts, failed MFA challenges, bad card information, etc. Any changes may trigger quarantine for the account, the card on any account, and the ip. If a card or ip is quarantined and used on another account that account is also quarantined.