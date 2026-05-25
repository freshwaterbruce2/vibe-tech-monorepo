import React, { useState } from 'react';
import styled from 'styled-components';
import { authService } from '../services/AuthService';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(8, 12, 20, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  font-family: 'Inter', system-ui, sans-serif;
`;

const ModalContainer = styled.div`
  width: 100%;
  max-width: 440px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(34, 211, 238, 0.25);
  box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  color: #f5f7fb;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #22d3ee;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  background: linear-gradient(135deg, #22d3ee 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  margin-bottom: 8px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#22d3ee' : 'transparent'};
  color: ${props => props.$active ? '#22d3ee' : '#94a3b8'};
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #22d3ee;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Input = styled.input`
  background: rgba(8, 17, 31, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 10px 14px;
  color: #f5f7fb;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #22d3ee;
    box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
  }
`;

const ErrorMsg = styled.div`
  color: #f43f5e;
  font-size: 13px;
  text-align: center;
  background: rgba(244, 63, 94, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(244, 63, 94, 0.2);
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #22d3ee 0%, #0e7490 100%);
  color: #08111f;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.95;
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.4);
  }

  &:disabled {
    background: #475569;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await authService.login(email, password);
      } else {
        await authService.register(email, password, fullName, companyName);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        
        <Title>{mode === 'login' ? 'Sign In' : 'Create Account'}</Title>
        
        <TabContainer>
          <Tab $active={mode === 'login'} onClick={() => { setMode('login'); setError(''); }} type="button">
            Login
          </Tab>
          <Tab $active={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); }} type="button">
            Register
          </Tab>
        </TabContainer>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <Form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <FormGroup>
                <Label>Full Name</Label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>Company Name</Label>
                <Input
                  type="text"
                  placeholder="Vibe Technologies"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </FormGroup>
            </>
          )}

          <FormGroup>
            <Label>Email Address</Label>
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Password</Label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormGroup>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </SubmitButton>
        </Form>
      </ModalContainer>
    </Overlay>
  );
};
