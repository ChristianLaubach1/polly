import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { KubectlV30Layer } from '@aws-cdk/lambda-layer-kubectl-v30';

export interface EksClusterStackProps extends StackProps {
  readonly account: string;
  readonly region: string;
  readonly codeBuildRoleArn: string;
}

export class EksClusterStack extends Stack {
  public readonly cluster: eks.Cluster;

  constructor(scope: Construct, id: string, props: EksClusterStackProps) {
    super(scope, id, props);

    // Create EKS Cluster with the correct kubectl layer
    this.cluster = new eks.Cluster(this, 'PollyCluster', {
      version: eks.KubernetesVersion.V1_30,
      defaultCapacity: 2,
      defaultCapacityInstance: new ec2.InstanceType('t3.medium'),
      kubectlLayer: new KubectlV30Layer(this, 'KubectlLayer'),
    });

    // Add cloud_user to aws-auth ConfigMap
    this.cluster.awsAuth.addUserMapping(iam.User.fromUserName(this, 'CloudUser', 'cloud_user'), {
      groups: ['system:masters']
    });

    // Create ServiceAccount with IAM role
    const pollyServiceAccount = this.cluster.addServiceAccount('PollyServiceAccount', {
      name: 'polly-service-account',
    });

    // Attach the policy to the ServiceAccount role
    pollyServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonPollyFullAccess'));
    pollyServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));

    // Add CodeBuild role to aws-auth ConfigMap dynamically
    this.cluster.awsAuth.addRoleMapping(iam.Role.fromRoleArn(this, 'CodeBuildRole', props.codeBuildRoleArn), {
      username: 'build',
      groups: ['system:masters'],
    });

    // Add specific permissions to the node group role
    if (this.cluster.defaultNodegroup) {
      this.addPollyPermissions(this.cluster.defaultNodegroup.role);
    } else {
      const nodegroupRole = iam.Role.fromRoleArn(this, 'NodegroupRole', `arn:aws:iam::${props.account}:role/EksClusterStack-PollyClusterNodegroupDefaultCapacit-cjp9bmXtaL9L`);
      this.addPollyPermissions(nodegroupRole);
    }
  }

  private addPollyPermissions(role: iam.IRole) {
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonPollyFullAccess'));
  }
}
