import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <Page>
      <TitleBar title="EyePop Listing Creator" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {/* Header with EyePop Branding */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="center" gap="400">
                  <img 
                    src="/eyepop-logo-horizontal-800.png" 
                    alt="EyePop.ai" 
                    style={{ height: '50px', width: 'auto' }}
                  />
                  {/* <Box 
                    background="bg-fill-brand-active"
                    padding="300"
                    borderRadius="100"
                  >
                    <Text variant="headingMd" as="h1" tone="text-inverse">
                      Listing Creator
                    </Text>
                  </Box> */}
                </InlineStack>
                <Text variant="bodyLg" as="p" alignment="center">
                  Transform your product images into complete Shopify listings with AI-powered content generation
                </Text>
              </BlockStack>
            </Card>

            {/* Main CTA */}
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="300">
                  <Text variant="headingLg" as="h2">
                    Ready to Generate Smart Product Listings?
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Upload your product images and let our AI create compelling titles, descriptions, 
                    tags, and SEO content automatically. Perfect for bulk product uploads and 
                    consistent brand messaging.
                  </Text>
                </BlockStack>
                
                <Banner tone="info">
                  <Text variant="bodyMd" as="p">
                    <strong>New:</strong> Upload multiple images at once and generate content for each image!
                  </Text>
                </Banner>

                <InlineStack gap="300">
                  <Button 
                    variant="primary" 
                    size="large"
                    url="/app/eyepop-test"
                  >
                    Start Generating Products
                  </Button>
                  {/* <Button 
                    variant="secondary"
                    loading={isLoading} 
                    onClick={generateProduct}
                  >
                    Create Test Product
                  </Button> */}
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Features */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  What You Get
                </Text>
                <Layout>
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h4">🎯 Smart Analysis</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        AI identifies products, colors, materials, and key features automatically
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h4">📝 Complete Content</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        Generates titles, descriptions, tags, SEO meta, and alt text
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h4">🚀 Shopify Ready</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        One-click export directly to your Shopify store
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            </Card>

            {/* Test Product Section */}
            {fetcher.data?.product && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Test Product Created Successfully
                  </Text>
                  <InlineStack gap="300">
                    <Button
                      url={`shopify:admin/products/${productId}`}
                      target="_blank"
                      variant="plain"
                    >
                      View in Shopify Admin
                    </Button>
                  </InlineStack>
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                    overflowX="scroll"
                  >
                    <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                      <code>{JSON.stringify(fetcher.data.product, null, 2)}</code>
                    </pre>
                  </Box>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
