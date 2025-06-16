// ExportResults component
// This component displays the results of a Shopify export operation

import React from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Icon,
  Box,
  Divider
} from "@shopify/polaris";
import { CheckIcon, AlertTriangleIcon, ExternalIcon } from '@shopify/polaris-icons';

interface ExportResult {
  fileName: string;
  success: boolean;
  productId?: string;
  shopifyProductId?: string;
  title?: string;
  handle?: string;
  status?: string;
  adminUrl?: string;
  publicUrl?: string;
  error?: string;
  details?: any;
}

interface ExportResultsProps {
  results: ExportResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTimeMs: number;
  };
  onClose?: () => void;
}

const ExportResults: React.FC<ExportResultsProps> = ({ results, summary, onClose }) => {
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  const handleOpenProduct = (adminUrl: string) => {
    try {
      window.open(adminUrl, '_blank');
    } catch (error) {
      console.warn('Could not open product in admin:', error);
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">Export Results</Text>
          {onClose && (
            <Button variant="plain" onClick={onClose}>
              Close
            </Button>
          )}
        </InlineStack>

        {/* Summary */}
        <Box background="bg-fill-secondary" padding="400" borderRadius="200">
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Summary</Text>
            <InlineStack gap="400" wrap>
              <InlineStack gap="200" align="center">
                <Icon source={CheckIcon} tone="success" />
                <Text variant="bodyMd" as="span">
                  <strong>{summary.successful}</strong> successful
                </Text>
              </InlineStack>
              {summary.failed > 0 && (
                <InlineStack gap="200" align="center">
                  <Icon source={AlertTriangleIcon} tone="critical" />
                  <Text variant="bodyMd" as="span">
                    <strong>{summary.failed}</strong> failed
                  </Text>
                </InlineStack>
              )}
              <Text variant="bodyMd" as="span" tone="subdued">
                Total: {summary.total} • Processing time: {(summary.processingTimeMs / 1000).toFixed(1)}s
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>

        {/* Successful Exports */}
        {successfulResults.length > 0 && (
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3" tone="success">
              Successfully Created Products ({successfulResults.length})
            </Text>
            <BlockStack gap="200">
              {successfulResults.map((result, index) => (
                <Box key={index} background="bg-fill-success-secondary" padding="300" borderRadius="200">
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <InlineStack gap="200" align="center">
                        <Icon source={CheckIcon} tone="success" />
                        <Text variant="bodyMd" as="span" fontWeight="medium">
                          {result.title || result.fileName}
                        </Text>
                        <Badge tone="success">{result.status || 'DRAFT'}</Badge>
                      </InlineStack>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Product ID: {result.productId} • Handle: {result.handle}
                      </Text>
                    </BlockStack>
                    {result.adminUrl && (
                      <Button
                        variant="plain"
                        icon={ExternalIcon}
                        onClick={() => handleOpenProduct(result.adminUrl!)}
                        size="slim"
                      >
                        View in Admin
                      </Button>
                    )}
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          </BlockStack>
        )}

        {/* Failed Exports */}
        {failedResults.length > 0 && (
          <>
            <Divider />
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3" tone="critical">
                Failed Exports ({failedResults.length})
              </Text>
              <BlockStack gap="200">
                {failedResults.map((result, index) => (
                  <Box key={index} background="bg-fill-critical-secondary" padding="300" borderRadius="200">
                    <BlockStack gap="200">
                      <InlineStack gap="200" align="center">
                        <Icon source={AlertTriangleIcon} tone="critical" />
                        <Text variant="bodyMd" as="span" fontWeight="medium">
                          {result.fileName}
                        </Text>
                        <Badge tone="critical">Failed</Badge>
                      </InlineStack>
                      <Text variant="bodySm" as="p" tone="critical">
                        Error: {result.error || 'Unknown error'}
                      </Text>
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </>
        )}

        {/* Action Buttons */}
        {successfulResults.length > 0 && (
          <InlineStack gap="300">
            <Button
              variant="primary"
              url="shopify:admin/products"
              target="_blank"
            >
              View All Products
            </Button>
            {successfulResults.length === 1 && successfulResults[0].adminUrl && (
              <Button
                variant="secondary"
                onClick={() => handleOpenProduct(successfulResults[0].adminUrl!)}
                icon={ExternalIcon}
              >
                View Created Product
              </Button>
            )}
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
};

export default ExportResults; 