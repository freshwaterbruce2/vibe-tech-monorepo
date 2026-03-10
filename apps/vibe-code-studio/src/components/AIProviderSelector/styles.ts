/**
 * AIProviderSelector Styled Components
 * All styled components for the AI Provider Selector
 */

import styled from 'styled-components';

// Main Container
export const Container = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
`;

export const SelectorButton = styled.button<{ $isOpen: boolean }>`
  width: 100%;
  padding: 10px 16px;
  background: ${props => props.$isOpen ? '#2a2a2a' : '#1e1e1e'};
  border: 1px solid ${props => props.$isOpen ? '#4a4a4a' : '#3a3a3a'};
  border-radius: ${props => props.$isOpen ? '8px 8px 0 0' : '8px'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2a2a2a;
    border-color: #4a4a4a;
  }
`;

export const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const ProviderIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  border-radius: 6px;
`;

export const ModelInfo = styled.div`
  flex: 1;
  text-align: left;
`;

export const ModelName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 2px;
`;

export const ModelDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
`;

export const Separator = styled.span`
  opacity: 0.5;
`;

export const PlaceholderText = styled.span`
  flex: 1;
  text-align: left;
  color: #666;
  font-size: 14px;
`;

export const ChevronIcon = styled.div<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  transition: transform 0.2s;
  color: #999;
`;

// Dropdown
export const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1e1e1e;
  border: 1px solid #3a3a3a;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  max-height: 500px;
  overflow-y: auto;
`;

export const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #2a2a2a;
`;

export const SearchInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: #4a4a4a;
  }

  &::placeholder {
    color: #666;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 4px;
`;

export const ActionButton = styled.button<{ $active?: boolean }>`
  padding: 6px;
  background: ${props => props.$active ? '#3a3a3a' : 'transparent'};
  border: none;
  border-radius: 4px;
  color: ${props => props.$active ? '#fff' : '#999'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #3a3a3a;
    color: #fff;
  }
`;

// Model List
export const ModelList = styled.div`
  padding: 8px;
`;

export const ProviderGroup = styled.div`
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ProviderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252525;
  border-radius: 6px;
  margin-bottom: 6px;
`;

export const ProviderTitle = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$color};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const ProviderStatus = styled.div<{ $isConfigured: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${props => props.$isConfigured ? '#00A67E' : '#999'};

  span {
    opacity: 0.8;
  }
`;

export const ModelItem = styled.div<{ $disabled?: boolean; $selected?: boolean }>`
  padding: 10px 12px;
  margin: 4px 0;
  background: ${props => props.$selected ? '#2a2a2a' : props.$disabled ? '#1a1a1a' : '#222'};
  border: 1px solid ${props => props.$selected ? '#4a4a4a' : 'transparent'};
  border-radius: 6px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.15s;

  &:hover {
    background: ${props => !props.$disabled && '#2a2a2a'};
    border-color: ${props => !props.$disabled && '#3a3a3a'};
  }
`;

export const ModelItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

export const ModelItemName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
`;

export const RecommendedBadge = styled.span`
  padding: 2px 6px;
  background: #00A67E20;
  color: #00A67E;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
`;

export const SelectedIcon = styled.div`
  color: #00A67E;
`;

export const ModelItemDetails = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

export const ModelSpec = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #999;
`;

export const ModelPrice = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #66a3ff;

  svg {
    opacity: 0.7;
  }
`;

export const ModelCapabilities = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

export const Capability = styled.span`
  padding: 2px 6px;
  background: #2a2a2a;
  border-radius: 3px;
  font-size: 10px;
  color: #888;
  text-transform: lowercase;
`;

// Usage Footer
export const UsageFooter = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: #252525;
  border-top: 1px solid #2a2a2a;
`;

export const UsageItem = styled.div`
  text-align: center;
`;

export const UsageLabel = styled.div`
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
  text-transform: uppercase;
`;

export const UsageValue = styled.div`
  font-size: 13px;
  color: #fff;
  font-weight: 600;
`;

// Settings Panel Styles
export const SettingsContainer = styled.div`
  padding: 16px;
`;

export const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 14px;
    color: #fff;
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #fff;
  }
`;

export const SettingsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const SettingItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SettingLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
  min-width: 120px;
`;

export const ApiKeyInput = styled.input`
  flex: 1;
  padding: 6px 10px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: #4a4a4a;
  }
`;

export const SaveButton = styled.button`
  padding: 6px 12px;
  background: #00A67E;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #00B88E;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Comparison Panel Styles
export const ComparisonContainer = styled.div`
  padding: 16px;
`;

export const ComparisonHeader = styled.div`
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 14px;
    color: #fff;
  }
`;

export const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th {
    padding: 6px;
    text-align: left;
    color: #999;
    border-bottom: 1px solid #3a3a3a;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
  }

  td {
    padding: 6px;
    color: #ccc;
    border-bottom: 1px solid #2a2a2a;
  }

  tbody tr:hover {
    background: #252525;
  }
`;
