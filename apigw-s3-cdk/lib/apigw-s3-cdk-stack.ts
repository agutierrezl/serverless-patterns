import * as cdk from '@aws-cdk/core';
//import * as s3 from "@aws-cdk/aws-s3";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as iam from "@aws-cdk/aws-iam";

export class ApigwS3CdkStack extends cdk.Stack {
  public readonly apiGatewayRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    //Create REST API
    const restApi = new apigw.RestApi(this, 'S3ObjectsApi', {
      restApiName: 'S3 Proxy Service',
      description: "S3 Actions Proxy API",
      endpointConfiguration: {
        types: [apigw.EndpointType.EDGE]
      },
      binaryMediaTypes: ['application/octet-stream', 'image/jpeg']
    });

    //Create {folder} API resource to list objects in a given bucket
    const bucketResource = restApi.root.addResource("{folder}");

    //Create {item} API resource to list objects in a given bucket
    const bucketItemResource = bucketResource.addResource("{item}");

    // Create IAM Role for API Gateway
    this.apiGatewayRole = new iam.Role(this, 'api-gateway-role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    });

    //ListAllMyBuckets method
    this.addActionToPolicy("s3:ListAllMyBuckets");
    const listMyBucketsIntegration = new apigw.AwsIntegration({
      service: "s3",
      region: "us-east-1",
      path: '/',
      integrationHttpMethod: "GET",
      options: {
        credentialsRole: this.apiGatewayRole,
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_TEMPLATES,
        integrationResponses: [{
          statusCode: '200',
          responseParameters: { 'method.response.header.Content-Type': 'integration.response.header.Content-Type'}
        }]        
      }
    });
    //ListAllMyBuckets method options
    const listMyBucketsMethodOptions = {
      authorizationType: apigw.AuthorizationType.IAM,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }]
    };
    restApi.root.addMethod("GET", listMyBucketsIntegration, listMyBucketsMethodOptions);

    //ListBucket (Objects) method
    this.addActionToPolicy("s3:ListBucket");
    const listBucketIntegration = new apigw.AwsIntegration({
      service: "s3",
      region: "us-east-1",
      path: '{bucket}',
      integrationHttpMethod: "GET",
      options: {
        credentialsRole: this.apiGatewayRole,
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_TEMPLATES,
        requestParameters: { 'integration.request.path.bucket': 'method.request.path.folder' },
        integrationResponses: [{
          statusCode: '200',
          responseParameters: { 'method.response.header.Content-Type': 'integration.response.header.Content-Type'}
        }]        
      }
    });
    //ListBucket method options
    const listBucketMethodOptions = {
      authorizationType: apigw.AuthorizationType.IAM,
      requestParameters: {
        'method.request.path.folder': true
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }]
    };
    bucketResource.addMethod("GET", listBucketIntegration, listBucketMethodOptions);


  }
  private addActionToPolicy(action: string) {
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
        resources: [
            "*"
        ],
        actions: [`${action}`]
    }));
}
}
