import { createTheme } from '@mui/material/styles'

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#580000', // PUP Maroon
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#C8960C', // PUP Gold
      contrastText: '#ffffff',
    },
    success: { main: '#1D9E75' },
    warning: { main: '#BA7517' },
    error: { main: '#E24B4A' },
    info: { main: '#1B3A6B' },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#580000',
          '& .MuiTableCell-head': {
            color: '#ffffff',
            fontWeight: 700,
          },
        },
      },
    },
  },
})
