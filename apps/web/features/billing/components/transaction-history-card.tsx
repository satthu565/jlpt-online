'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Modal } from '@jlpt/ui/components/modal';
import { Input } from '@jlpt/ui/components/input';
import { Alert } from '@jlpt/ui/components/alert';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@jlpt/ui/components/table';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { Clock, RotateCcw, X, Check } from 'lucide-react';
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
            <Badge variant="warning" data-testid={`tx-refund-status-${tx.orderId}`} className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>{t('billing.refund.statusRequested')}</span>
            </Badge>
          );
        case 'approved':
        case 'refunded':
          return (
            <Badge variant="error" data-testid={`tx-refund-status-${tx.orderId}`} className="flex items-center gap-1">
              <RotateCcw className="size-3" />
              <span>{t('billing.refund.statusRefunded')}</span>
            </Badge>
          );
        case 'rejected':
          return (
            <Badge variant="default" data-testid={`tx-refund-status-${tx.orderId}`} className="flex items-center gap-1">
              <X className="size-3" />
              <span>{t('billing.refund.statusRejected')}</span>
            </Badge>
          );
        default:
          break;
      }
    }

    switch (tx.status) {
      case 'paid':
        return (
          <Badge variant="success" data-testid={`tx-status-${tx.orderId}`} className="flex items-center gap-1">
            <Check className="size-3" />
            <span>{t('billing.transactions.statusPaid')}</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" data-testid={`tx-status-${tx.orderId}`} className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>{t('billing.transactions.statusPending')}</span>
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="error" data-testid={`tx-status-${tx.orderId}`} className="flex items-center gap-1">
            <RotateCcw className="size-3" />
            <span>{t('billing.transactions.statusRefunded')}</span>
          </Badge>
        );
      case 'failed':
      case 'cancelled':
        return (
          <Badge variant="default" data-testid={`tx-status-${tx.orderId}`} className="flex items-center gap-1">
            <X className="size-3" />
            <span>{tx.status}</span>
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

      <CardContent className="flex flex-col gap-4">
        {refundResult && (
          <Alert variant="info" onClose={() => setRefundResult(null)}>
            {t('billing.refund.requestSubmittedNotice', {
              orderId: refundResult.orderId,
              status: refundResult.status,
            })}
          </Alert>
        )}

        {transactions.length === 0 ? (
          <EmptyState
            variant="empty"
            title={t('billing.transactions.empty')}
            minHeight="sm"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('billing.transactions.orderId')}</TableHead>
                <TableHead>{t('billing.transactions.date')}</TableHead>
                <TableHead>{t('billing.transactions.amount')}</TableHead>
                <TableHead>{t('billing.transactions.status')}</TableHead>
                <TableHead className="text-right">{t('billing.transactions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const isEligibleForRefund =
                  tx.status === 'paid' &&
                  (!tx.refundStatus || tx.refundStatus === 'rejected') &&
                  (!refundResult || refundResult.orderId !== tx.orderId);

                return (
                  <TableRow
                    key={tx.orderId}
                    data-testid={`tx-row-${tx.orderId}`}
                  >
                    <TableCell className="font-mono">
                      {tx.orderId}
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {tx.currency === 'VND'
                        ? `${tx.amountMinor.toLocaleString('vi-VN')}₫`
                        : `${(tx.amountMinor / 100).toLocaleString()} ${tx.currency}`}
                    </TableCell>
                    <TableCell>
                      {getOrderStatusBadge(tx)}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Refund Request Modal */}
        {activeTransactionForRefund && (
          <Modal
            isOpen={Boolean(activeTransactionForRefund)}
            onClose={() => setActiveTransactionForRefund(null)}
            title={t('billing.refund.modalTitle')}
          >
            <form onSubmit={handleSubmitRefund} className="flex flex-col gap-4">
              <p className="m-0 text-[var(--text-secondary)] text-sm">
                {t('billing.refund.modalDescription', {
                  orderId: activeTransactionForRefund.orderId,
                  amount: activeTransactionForRefund.currency === 'VND'
                    ? `${activeTransactionForRefund.amountMinor.toLocaleString('vi-VN')}₫`
                    : `${(activeTransactionForRefund.amountMinor / 100).toLocaleString()} ${activeTransactionForRefund.currency}`,
                })}
              </p>

              {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <div>
                <label htmlFor="refund-reason-input" className="block mb-1 font-semibold text-sm">
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

              <div className="flex justify-end gap-3 mt-2">
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
