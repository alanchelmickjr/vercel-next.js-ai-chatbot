'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToolExecutionDisplay } from '@/components/tool-execution-display';
import { useMCPTools, useMCPTool, MCPServer, MCPTool } from '@/hooks/use-mcp-tools';
import { Database, Server, Search, FileText, Code, FolderOpen, RefreshCw } from 'lucide-react';

/**
 * MCP Tool Display Component
 * 
 * This component displays available MCP servers and tools,
 * and allows the user to execute them.
 */
export function MCPToolDisplay() {
  const [activeTab, setActiveTab] = useState('servers');
  const { servers, isLoading, error, executingTools, refreshServers } = useMCPTools();
  
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse flex flex-col space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="p-4">
        <div className="text-red-500">
          Error loading MCP servers: {error.message}
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Server className="text-blue-500" size={20} />
          MCP Tools
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshServers}
          className="flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="servers">Servers</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="active">Active ({executingTools.length})</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="servers" className="p-4 pt-2">
          {servers.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No MCP servers connected
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((server) => (
                <ServerCard key={server.name} server={server} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="tools" className="p-4 pt-2">
          {servers.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No MCP servers connected
            </div>
          ) : (
            <div className="space-y-6">
              {servers.map((server) => (
                <div key={server.name}>
                  <h3 className="text-md font-medium mb-2 flex items-center gap-1">
                    <Database size={16} className="text-blue-500" />
                    {server.name} ({server.tools.length} tools)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {server.tools.map((tool) => (
                      <ToolCard 
                        key={`${server.name}:${tool.name}`} 
                        server={server} 
                        tool={tool} 
                      />
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="active" className="p-4 pt-2">
          {executingTools.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No active tool executions
            </div>
          ) : (
            <div className="space-y-4">
              {executingTools.map((status) => (
                <ToolExecutionDisplay 
                  key={status.toolCallId} 
                  toolCallId={status.toolCallId} 
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/**
 * Server Card Component
 */
function ServerCard({ server }: { server: MCPServer }) {
  return (
    <Card className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-md font-medium flex items-center gap-1">
            <Server size={16} className="text-blue-500" />
            {server.name}
          </h3>
          <p className="text-sm text-gray-500">{server.description}</p>
        </div>
        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          v{server.version}
        </div>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <span className="font-medium">Tools:</span> {server.tools.length}
        </div>
        <div>
          <span className="font-medium">Resources:</span> {server.resources.length}
        </div>
      </div>
    </Card>
  );
}

/**
 * Tool Card Component
 */
function ToolCard({ server, tool }: { server: MCPServer, tool: MCPTool }) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const { execute, isExecuting, activeExecutions } = useMCPTool(server.name, tool.name);
  
  // Get required parameters from the input schema
  const requiredParams = tool.inputSchema?.required || [];
  const properties = tool.inputSchema?.properties || {};
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Convert string values to appropriate types
      const processedArgs = Object.entries(args).reduce((acc, [key, value]) => {
        const propType = properties[key]?.type;
        
        if (propType === 'number') {
          acc[key] = Number(value);
        } else if (propType === 'boolean') {
          acc[key] = value === 'true';
        } else {
          acc[key] = value;
        }
        
        return acc;
      }, {} as Record<string, any>);
      
      // Execute the tool
      await execute(processedArgs);
    } catch (error) {
      console.error('Error executing tool:', error);
    }
  };
  
  // Get the appropriate icon for the tool
  const getToolIcon = () => {
    if (tool.name.includes('search')) {
      return <Search size={16} className="text-purple-500" />;
    } else if (tool.name.includes('file')) {
      return <FileText size={16} className="text-green-500" />;
    } else if (tool.name.includes('repo')) {
      return <Code size={16} className="text-blue-500" />;
    } else if (tool.name.includes('index')) {
      return <Database size={16} className="text-amber-500" />;
    } else {
      return <FolderOpen size={16} className="text-gray-500" />;
    }
  };
  
  return (
    <Card className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1">
          {getToolIcon()}
          {tool.name}
        </h4>
      </div>
      
      <p className="text-xs text-gray-500 mt-1 mb-2">{tool.description}</p>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        {requiredParams.map((param: string) => (
          <div key={param} className="space-y-1">
            <label className="text-xs font-medium">{param}:</label>
            <Input
              type={properties[param]?.type === 'number' ? 'number' : 'text'}
              placeholder={properties[param]?.description || param}
              value={args[param] || ''}
              onChange={(e) => setArgs({ ...args, [param]: e.target.value })}
              className="h-7 text-xs"
              required
            />
          </div>
        ))}
        
        <Button 
          type="submit" 
          size="sm" 
          className="w-full text-xs h-7"
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <RefreshCw size={12} className="mr-1 animate-spin" />
              Executing...
            </>
          ) : (
            'Execute'
          )}
        </Button>
      </form>
      
      {activeExecutions.length > 0 && (
        <div className="mt-2">
          {activeExecutions.map((status) => (
            <div key={status.toolCallId} className="text-xs text-blue-500">
              Execution in progress...
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}