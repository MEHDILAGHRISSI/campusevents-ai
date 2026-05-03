import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui-kit';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Error Boundary component to catch React render errors
 * Prevents app crashes and shows user-friendly error UI
 * 
 * Usage:
 * <ErrorBoundary onError={(error) => console.error(error)}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error) {
    // Log error for debugging
    console.error('Error caught by boundary:', error);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <Screen style={styles.container}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Oups! Une erreur s&apos;est produite</Text>
            <Text style={styles.errorMessage}>{this.state.error.message}</Text>
            <Text style={styles.errorStack}>{this.state.error.stack}</Text>
          </View>
        </Screen>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  errorStack: {
    fontSize: 10,
    color: '#7f1d1d',
    fontFamily: 'monospace',
    marginTop: 8,
  },
});
