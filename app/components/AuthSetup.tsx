// EyePop Authentication Setup Component
// This component handles the authentication flow for EyePop API integration
// Users can enter their Secret Key and Pop ID, or be redirected to create an account

import React, { useState, useCallback } from 'react';
import {
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Banner,
  Link,
  Icon,
  Box,
  Divider,
  Badge
} from "@shopify/polaris";
import { ExternalIcon, CheckIcon, AlertTriangleIcon } from '@shopify/polaris-icons';

interface AuthSetupProps {
  onAuthSuccess: (credentials: { secretKey: string }) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

interface AuthCredentials {
  secretKey: string;
}

const AuthSetup: React.FC<AuthSetupProps> = ({ onAuthSuccess, onSkip, isLoading = false }) => {
  const [credentials, setCredentials] = useState<AuthCredentials>({
    secretKey: '' // Start with empty credentials
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCredentialChange = useCallback((field: keyof AuthCredentials) => (value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset connection status when credentials change
    if (connectionStatus !== 'idle') {
      setConnectionStatus('idle');
      setErrorMessage('');
    }
  }, [connectionStatus]);

  const testConnection = useCallback(async () => {
    if (!credentials.secretKey.trim()) {
      setErrorMessage('Secret Key is required');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setErrorMessage('');

    try {
      // Test the connection by making a simple API call
      const testFormData = new FormData();
      testFormData.append('secretKey', credentials.secretKey);
      testFormData.append('test', 'true');

      const response = await fetch('/api/eyepop-test-connection', {
        method: 'POST',
        body: testFormData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConnectionStatus('success');
        setTimeout(() => {
          onAuthSuccess({
            secretKey: credentials.secretKey
          });
        }, 1000);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('Failed to test connection. Please check your credentials.');
    } finally {
      setIsTestingConnection(false);
    }
  }, [credentials, onAuthSuccess]);

  const handleSubmit = useCallback(() => {
    if (connectionStatus === 'success') {
      onAuthSuccess({
        secretKey: credentials.secretKey
      });
    } else {
      testConnection();
    }
  }, [connectionStatus, credentials, onAuthSuccess, testConnection]);

  return (
    <Card>
      <BlockStack gap="500">
        {/* Header */}
        <BlockStack gap="300">
          <InlineStack align="center" gap="300">
            <img 
              src="/eyepop-logo-horizontal-800.png" 
              alt="EyePop.ai" 
              style={{ height: '40px', width: 'auto' }}
            />
          </InlineStack>
          <Text variant="headingLg" as="h2">
            Connect Your EyePop Account
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            To use the Listing Creator, you need to connect your EyePop account. 
            This allows us to process your images with AI-powered analysis.
          </Text>
        </BlockStack>

        {/* New User Banner */}
        <Banner tone="info">
          <BlockStack gap="200">
            <Text variant="bodyMd" as="p">
              <strong>New to EyePop?</strong> Create your free account to get started with AI-powered image analysis.
            </Text>
            <InlineStack gap="200">
              <Link 
                url="https://www.eyepop.ai/" 
                external
                removeUnderline
              >
                <Button 
                  variant="secondary" 
                  icon={ExternalIcon}
                  size="slim"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link 
                url="https://docs.eyepop.ai/developer-documentation/api-key" 
                external
                removeUnderline
              >
                <Button 
                  variant="plain" 
                  icon={ExternalIcon}
                  size="slim"
                >
                  How to get API Key
                </Button>
              </Link>
            </InlineStack>
          </BlockStack>
        </Banner>

        <Divider />

        {/* Credentials Form */}
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Enter Your Credentials
          </Text>
          
          <TextField
            label="API Key"
            value={credentials.secretKey}
            onChange={handleCredentialChange('secretKey')}
            placeholder="Enter your EyePop API Key"
            helpText="Your EyePop API Key for authentication"
            type="password"
            autoComplete="off"
            disabled={isLoading || isTestingConnection}
            error={connectionStatus === 'error' && !credentials.secretKey.trim() ? 'Secret Key is required' : undefined}
          />

          {/* Connection Status */}
          {connectionStatus === 'success' && (
            <Banner tone="success">
              <InlineStack gap="200" align="center">
                <Icon source={CheckIcon} tone="success" />
                <Text variant="bodyMd" as="p">
                  Connection successful! Ready to process images.
                </Text>
              </InlineStack>
            </Banner>
          )}

          {connectionStatus === 'error' && errorMessage && (
            <Banner tone="critical">
              <InlineStack gap="200" align="center">
                <Icon source={AlertTriangleIcon} tone="critical" />
                <Text variant="bodyMd" as="p">
                  {errorMessage}
                </Text>
              </InlineStack>
            </Banner>
          )}

          {/* Action Buttons */}
          <InlineStack gap="300">
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isTestingConnection || isLoading}
              disabled={!credentials.secretKey.trim()}
            >
              {connectionStatus === 'success' ? 'Continue' : 'Test Connection'}
            </Button>
            
            {onSkip && (
              <Button
                variant="secondary"
                onClick={onSkip}
                disabled={isTestingConnection || isLoading}
              >
                Skip for Now
              </Button>
            )}
          </InlineStack>
        </BlockStack>

        {/* Help Section */}
        <Box background="bg-fill-secondary" padding="400" borderRadius="200">
          <BlockStack gap="300">
            <Text variant="headingSm" as="h4">
              Need Help?
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Your API Key is used to authenticate with the EyePop API. It's completely secure and 
              only used to process your images. We never store or share your credentials.
            </Text>
            <InlineStack gap="300">
              <Link url="https://docs.eyepop.ai/" external>
                <Button variant="plain" size="slim" icon={ExternalIcon}>
                  Documentation
                </Button>
              </Link>
              <Link url="https://www.eyepop.ai/terms-and-conditions" external>
                <Button variant="plain" size="slim" icon={ExternalIcon}>
                  Terms & Conditions
                </Button>
              </Link>
              <Link url="https://www.eyepop.ai/privacy-policy" external>
                <Button variant="plain" size="slim" icon={ExternalIcon}>
                  Privacy Policy
                </Button>
              </Link>
              <Text variant="bodyMd" as="p">
                Need help? Contact us at: <Text as="span" fontWeight="semibold">help@eyepop.ai</Text>
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
};

export default AuthSetup; 