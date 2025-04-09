import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
// import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import path = require('path');

export class ComplianceAlertStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'compliance_alert_vpc', {
      maxAzs: 1,
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: 'PublicSubnet',
        }
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, 'MySecurityGroup', {
      vpc,
      description: 'Allow SSH and HTTP access',
      allowAllOutbound: true, // For simplicity
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8000),
      'Allow HTTP traffic on port 8000'
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), // Or, ec2.Peer.ipv4('YOUR_IP_ADDRESS/32') for more security
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    const chromadb_server = new ec2.Instance(this, 'chromadb_server', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      userData: ec2.UserData.forLinux(),
      keyName: 'compliance-alert-system-key-pair', // Replace with your key pair name
      securityGroup: securityGroup,
    });

    // const webserver_instance = new ec2.Instance(this, 'webserver_instance', {
    //   vpc: vpc,     
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    //   machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    //   userData: ec2.UserData.forLinux(),
    // });

    chromadb_server.userData.addCommands(
      'sudo yum update -y',
      'python3 -m ensurepip --upgrade',
      'pip3 install chromadb',
      'mkdir db',
      'chroma run --path ./db --host 0.0.0.0'
    );

    //  

    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: chromadb_server.instancePublicIp,
      description: 'Public IP address of the EC2 instance',
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: chromadb_server.instanceId,
      description: 'ID of the EC2 instance',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });
  }
}
