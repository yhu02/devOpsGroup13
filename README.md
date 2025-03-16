# Project Overview:
Modern cloud environments consist of various interconnected applications and services, making it challenging to understand and manage their relationships effectively. While traditional monitoring tools offer basic insights, there is a growing need for intelligent visualization systems that automatically discover and present complex application dependencies in an actionable format.

This project aims to develop a containerized solution that identifies, maps, and visualizes the dependencies between cloud resources in a selected cloud environment. The system will facilitate better cloud resource management, enhance observability, and support DevOps teams in optimizing deployment strategies.

# Project Requirements:

The project will be developed from scratch, focusing on:

Dependency Discovery – Building a solution to identify and visualize links between cloud resources.
Containerized Deployment – Ensuring the solution is fully containerized and runs within the target cloud environment.
#Expected Deliverables:

At a minimum, the project will deliver:

* A design blueprint of the solution.
* A working prototype demonstrating real-time cloud resource dependencies.
* A DevOps pipeline supporting automated build, testing, release, and deployment.
# Additional Feature (Optional):
Explainability in Dependency Mapping – Providing insights into how and why cloud resources are interlinked.

# Local installation using Dockerfile
docker build -t cloudvisualizer .
docker run -p 5173:5173 cloudvisualizer

# Deployment in AWS
Clone this repo
Configure AWS OIDC for automatic deployment
Create a VPC
Add the VPC id to /platform/v1/vpc/id in SSM
Create a Hosted Zone
Add the Hosted Zone name to /platform/v1/dns/public/name in SSM
Add the Hosted Zone id to /platform/v1/dns/public/id in SSM
Deploy using the pipeline, and view the running ecs container using the AWS console
