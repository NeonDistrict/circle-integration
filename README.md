# Circle Integration
Contains documentation, demo, and back/front end components required to integrate circle payments into a project.

## Useful Links

+ [Circle Homepage](https://www.circle.com/en/)
+ [Circle Payments API Documentation](https://developers.circle.com/docs/accept-card-payments-online)
+ [Neon District Circle Integration Dev Server: 54.211.86.53](54.211.86.53) 54.211.86.53

## Setting up an EC2 Instance

1. Create an amazon linux ec2 instance
1. Install dependencies using yum

```
sudo yum groupinstall 'Development Tools' -y
sudo curl --silent --location https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install nodejs -y
```