'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Alert } from '@jlpt/ui';
import type { TransactionItem, RefundRequestInput, RefundRequestResponse } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface TransactionHistoryCardProps {
  transactions: TransactionItem[];
  onRequestRefund: (input: RefundRequestInput) => Promise<RefundRequestResponse>;
}

export function TransactionHistoryCard({
  transactions,
  onRequestRefund,
}: TransactionHistoryCardProps): React.JSX.Element {
  const { t } = useI18n();

  const [activeTransactionForRefund, setActiveTransactionForRefund] = useState<TransactionItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundResult, setRefundResult] = useState<{ orderId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getOrderStatusBadge = (tx: TransactionItem) => {
    // If there is an active refund status or refund result override
    const refundStatus = refundResult && refundResult.orderId === tx.orderId
      ? refundResult.status
      : tx.refundStatus;

    if (refundStatus) {
      switch (refundStatus) {
        case 'requested':
          return (
            <Badge variant="warning" data-testid={`tx-refund-status-${tx.orderId}`}>
              ⏳ {t('billing.refund.statusRequested')}
            </Badge>
          );
        case 'approved':
        case 'refunded':
          return (
            <Badge variant="error" data-testid={`tx-refund-status-${tx.orderId}`}>
              ↩️ {t('billing.refund.statusRefunded')}
            </Badge>
          );
        case 'rejected':
          return (
            <Badge variant="default" data-testid={`tx-refund-status-${tx.orderId}`}>
              ✕ {t('billing.refund.statusRejected')}
            </Badge>
          );
        default:
          break;
      }
    }

    switch (tx.status) {
      case 'paid':
        return (
          <Badge variant="success" data-testid={`tx-status-${tx.orderId}`}>
            ✓ {t('billing.transactions.statusPaid')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" data-testid={`tx-status-${tx.orderId}`}>
            ⏳ {t('billing.transactions.statusPending')}
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="error" data-testid={`tx-status-${tx.orderId}`}>
            ↩️ {t('billing.transactions.statusRefunded')}
          </Badge>
        );
      case 'failed':
      case 'cancelled':
        return (
          <Badge variant="default" data-testid={`tx-status-${tx.orderId}`}>
            ✕ {tx.status}
          </Badge>
        );
      default:
        return <Badge variant="default">{tx.status}</Badge>;
    }
  };

  const handleOpenRefundModal = (tx: TransactionItem) => {
    setActiveTransactionForRefund(tx);
    setRefundReason('');
    setError(null);
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransactionForRefund || !refundReason.trim()) return;

    setSubmittingRefund(true);
    setError(null);
    try {
      const res = await onRequestRefund({
        transactionId: activeTransactionForRefund.orderId,
        reason: refundReason.trim(),
        amountMinor: activeTransactionForRefund.amountMinor,
      });

      setRefundResult({
        orderId: activeTransactionForRefund.orderId,
        status: res.status || 'requested',
      });
      setActiveTransactionForRefund(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('billing.refund.submitError'));
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <Card data-testid="transaction-history-card">
      <CardHeader>
        <CardTitle>{t('billing.transactions.cardTitle')}</CardTitle>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {refundResult && (
          <Alert variant="info" onClose={() => setRefundResult(null)}>
            {t('billing.refund.requestSubmittedNotice', {
              orderId: refundResult.orderId,
              status: refundResult.status,
            })}
          </Alert>
        )}

        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
            {t('billing.transactions.empty')}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>{t('billing.transactions.orderId')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('billing.transactions.date')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('billing.transactions.amount')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('billing.transactions.status')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>{t('billing.transactions.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isEligibleForRefund =
                    tx.status === 'paid' &&
                    (!tx.refundStatus || tx.refundStatus === 'rejected') &&
                    (!refundResult || refundResult.orderId !== tx.orderId);

                  return (
                    <tr
                      key={tx.orderId}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      data-testid={`tx-row-${tx.orderId}`}
                    >
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                        {tx.orderId}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        {(tx.amountMinor / 100).toLocaleString('vi-VN')}₫
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {getOrderStatusBadge(tx)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {isEligibleForRefund && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRefundModal(tx)}
                            data-testid={`request-refund-${tx.orderId}`}
                            aria-label={t('billing.refund.requestButtonAria', { orderId: tx.orderId })}
                          >
                            {t('billing.refund.requestButton')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Refund Request Modal */}
        {activeTransactionForRefund && (
          <Modal
            isOpen={Boolean(activeTransactionForRefund)}
            onClose={() => setActiveTransactionForRefund(null)}
            title={t('billing.refund.modalTitle')}
          >
            <form onSubmit={handleSubmitRefund} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                {t('billing.refund.modalDescription', {
                  orderId: activeTransactionForRefund.orderId,
                  amount: `${(activeTransactionForRefund.amountMinor / 100).toLocaleString('vi-VN')}₫`,
                })}
              </p>

              {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <div>
                <label htmlFor="refund-reason-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  {t('billing.refund.reasonLabel')} *
                </label>
                <Input
                  id="refund-reason-input"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder={t('billing.refund.reasonPlaceholder')}
                  required
                  data-testid="refund-reason-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="outline" onClick={() => setActiveTransactionForRefund(null)}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submittingRefund}
                  data-testid="submit-refund-button"
                >
                  {t('billing.refund.submitButton')}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </CardContent>
    </Card>
  );
}
