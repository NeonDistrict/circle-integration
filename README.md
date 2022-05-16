# Circle Integration
Contains documentation and back/front end components required to integrate circle payments into a project. You probably just want `API.md` and `USAGE.md`.

## Useful Links

+ [Circle Homepage](https://www.circle.com/en/)
+ [Circle Payments API Documentation](https://developers.circle.com/docs/accept-card-payments-online)
+ [Neon District Circle Integration Dev Server: 54.211.86.53](https://54.211.86.53) 54.211.86.53
+ [Neon District Circle Integration Dev Server By Host: dev.circle-integration.neondistrict.io](https://dev.circle-integration.neondistrict.io) dev.circle-integration.neondistrict.io

## What Is This?

Circle is a payment processor who is ool with blockchain applications, which is why we use them. This repository contains:

1. The circle integration server module `server.js` which can be run with `index.js`.
2. The circle integration client module `circle_integration_client.js` which is included in the game frontend and handles all calls to the circle integration server module.
3. The circle integration crm module `circle_integration_crm_client.js` (customer relationship management) which is included in the admin panel frontend to access details about purchases and to cancel or refund purchases.

## Important Things

1. You will need keys to make your own server, they go into the root of project in a folder called `keys/`.
2. You require `circle_key_dev` which contains the key for interacting with circle, `email_keys.js` which contains the keys for aws ses to send emails, `fullchain.pem` `privkey.pem` which together provide SSL/HTTPS support via lets encrypt, and `postgres_dev.js` which contains the user, host, password, port, and database for accessing postgres.
3. The circle integration server can only run on AWS EC2 because of it's hard requirement to use AWS SNS which does not run locally (without extreme workarounds).
4. You don't want to create your own development server, you want to use the development server already established on EC2 (which is linked above in useful links and has a hostname setup for it).
5. All logs go out to paper trail, let adrian know if you need access to it.


## Setting up an EC2 Instance

1. Create an amazon linux ec2 instance, if you use a micro instance the remote vs code connection will drop a lot, make sure you use a C or M machine type at least.
1. Add to security group `neon-district-circle-integration-dev` or `neon-district-circle-integration-prod`
1. Make sure you have access to the appropriate keypair namely `neon-district-circle-integration-dev.pem` or `neon-district-circle-integration-prod.pem`
1. When the instance is created provide is a meaningful name like `neon-district-circle-integration-dev` (are you sensing the pattern here yet?)
1. If an old machine exists, dissassociate the existing elastic IP
1. Go to elastic IPs and assign the appropriate IP to your new instance, it should already exist and be called `neon-district-circle-integration-dev` or `neon-district-circle-integration-prod`
1. SSH in
1. Run the following to prep the machine:
    ```
    sudo yum groupinstall 'Development Tools' -y
    sudo curl --silent --location https://rpm.nodesource.com/setup_14.x | sudo bash -
    sudo yum install nodejs -y
    sudo npm install pm2 -g
    sudo amazon-linux-extras install epel
    sudo yum install certbot-apache -y
    ```
1. Copy all keys to the `./keys` directory at the root of the project, for the love of god make sure you dont put the prod keys in dev, or the dev keys on prod

## Configuring deployment

1. Create an elastic IP and point it at the ec2 instance
1. In Route53 setup a subdomain and point it at the elastic IP

## Renewing SSL Certificates

1. Stop the server
1. Run `sudo certbot certonly --standalone`
1. Follow prompts, for dev use `dev.circle-integration.neondistrict.io`
1. Certs will be placed at:
    ```
    /etc/letsencrypt/live/dev.circle-integration.neondistrict.io/fullchain.pem
    /etc/letsencrypt/live/dev.circle-integration.neondistrict.io/privkey.pem
    ```
1. Copy these to the keys directory:
    ```
    sudo cp /etc/letsencrypt/live/dev.circle-integration.neondistrict.io/fullchain.pem ~/circle-integration/keys/fullchain.pem
    sudo cp /etc/letsencrypt/live/dev.circle-integration.neondistrict.io/privkey.pem ~/circle-integration/keys/privkey.pem
    ```
1. Restart the server 

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

## Running Tests

A VS Code `launch.json` is included in the project, simply select `Launch Program` or `Mocha Tests` from the `Run and Debug` dropdown to run either with full debug support. Make sure the pm2 instance is stopped before running tests.

## Running Server with PM2

1. Setup PM2 to recover on reboot by running:
    ```
    pm2 startup
    ```
1. Copy and paste the script it provides and run it, this will add PM2 to systemd
1. Start the server:
    ```
    pm2 start ./src/index.js --node-args="--unhandled-rejections=strict"
    ```
1. Run the following to save the PM2 processes which will recover them on reboot:
    ```
    pm2 save
    ```

*The node argument for unhandled rejections allows the server to crash on unhandled exceptions which is desired behaviour. These types of crashes are representitive of a critical failure, critical bug, or malicious event - all of which should stop the server for human investigation and intervention. No payments are better than fraudulent payments.*
